/* ══════════════════════════════════
   PvP WHEEL  —  полная перезапись
   ══════════════════════════════════ */

const PVP_COLORS = [
  '#3df2a0','#e74c3c','#5b8def','#f1c40f',
  '#9b59b6','#1cd1a1','#e67e22','#ff6fb7',
  '#00e5ff','#f4c430'
];
const PVP_MIN_BET = 50;

/* ─ state ─ */
let pvpState        = null;   // текущее состояние с сервера
let pvpPollInterval = null;
let pvpCanvas       = null;
let pvpCtx          = null;
let pvpAnimFrame    = null;
let pvpSpinning     = false;
let pvpAvatarCache  = {};     // uid → Image | null
let pvpShownGameId  = null;   // ID игры для которой уже показали результат
let pvpResultTimer  = null;
let pvpCountdownRAF = null;

/* ─ history (локальная, за последний час) ─ */
let pvpHistory = [];  // [{id, players, totalBet, winner, finishedAt}]

/* ══ POLLING ══ */
function startPvpPolling(){
  if(pvpPollInterval) return;
  fetchPvpState();
  pvpPollInterval = setInterval(fetchPvpState, 2000);
}
function stopPvpPolling(){
  clearInterval(pvpPollInterval);
  pvpPollInterval = null;
}

async function fetchPvpState(){
  try{
    const r = await fetch('/api/pvp/state');
    const d = await r.json();
    if(!d.ok) return;
    pvpState = d.game;
    if(pvpState?.players) preloadAvatars(pvpState.players);
    applyPvpState();
  }catch{}
}

/* ══ AVATAR PRELOAD ══ */
function preloadAvatars(players){
  players.forEach(p=>{
    if(pvpAvatarCache[p.uid] !== undefined) return; // уже загружен или null
    pvpAvatarCache[p.uid] = null; // помечаем что пробовали
    if(!p.photoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = ()=>{ pvpAvatarCache[p.uid] = img; };
    img.onerror = ()=>{ pvpAvatarCache[p.uid] = null; };
    img.src = p.photoUrl;
  });
}

/* ══ MAIN STATE MACHINE ══ */
function applyPvpState(){
  if(curPage !== 'pvp') return;
  const g = pvpState;

  // ── Нет игры ──
  if(!g){
    stopAllPvpAnimations();
    showPvpBlock('idle');
    renderHistoryBlock();
    return;
  }

  // ── Ожидание / наполнение ──
  if(g.state === 'waiting' || g.state === 'filling'){
    stopAllPvpAnimations();
    showPvpBlock('lobby');
    renderLobby(g);
    return;
  }

  // ── Countdown / spinning → показываем колесо ──
  if(g.state === 'countdown' || g.state === 'spinning'){
    showPvpBlock('ingame');
    renderIngamePlayers(g);
    ensureCanvas(g);

    if(g.state === 'countdown'){
      document.getElementById('pvp-ingame-label').textContent = '🚀 Игра начинается!';
      startCountdownDraw(g);
    } else if(g.state === 'spinning' && !pvpSpinning){
      pvpSpinning = true;
      document.getElementById('pvp-ingame-label').textContent = '🎡 Колесо крутится...';
      cancelAnimationFrame(pvpCountdownRAF);
      startSpinAnimation(g);
    }
    return;
  }

  // ── Done ──
  if(g.state === 'done'){
    // Показываем результат только один раз для этой игры
    if(pvpShownGameId === g.id) return;
    pvpShownGameId = g.id;

    stopAllPvpAnimations();
    showPvpBlock('ingame'); // колесо остаётся видно
    ensureCanvas(g);
    drawWheel(g, calcTargetRot(g), null); // финальная позиция

    // Показать результат поверх
    document.getElementById('pvp-result-block').style.display = 'flex';
    renderResult(g);
  }
}

/* ══ BLOCK VISIBILITY ══ */
function showPvpBlock(name){
  // name: 'idle' | 'lobby' | 'ingame'
  document.getElementById('pvp-idle-block').style.display   = name==='idle'   ? 'block' : 'none';
  document.getElementById('pvp-lobby-block').style.display  = name==='lobby'  ? 'block' : 'none';
  document.getElementById('pvp-ingame-block').style.display = name==='ingame' ? 'block' : 'none';
  if(name !== 'ingame') document.getElementById('pvp-result-block').style.display = 'none';
}

/* ══ LOBBY ══ */
function renderLobby(g){
  const stateEl = document.getElementById('pvp-state-label');
  const timerEl = document.getElementById('pvp-timer');
  const list    = document.getElementById('pvp-players-list');
  const countEl = document.getElementById('pvp-count');
  const totalEl = document.getElementById('pvp-total');
  if(!list) return;

  countEl.textContent = g.players.length + ' / 10';
  totalEl.textContent = g.totalBet.toLocaleString('ru') + ' 🪙';

  list.innerHTML = g.players.map((p,i)=>{
    const pct  = ((p.bet/g.totalBet)*100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div class="pvp-player-row">
      <div class="pvp-player-dot" style="background:${PVP_COLORS[i%10]}"></div>
      <div class="pvp-player-info">
        <div class="pvp-player-name">${isMe?'👤 Вы':(p.username?'@'+p.username:p.firstName)}</div>
        <div class="pvp-player-bar-wrap"><div class="pvp-player-bar" style="width:${pct}%;background:${PVP_COLORS[i%10]}"></div></div>
      </div>
      <div class="pvp-player-right">
        <div class="pvp-player-bet">${p.bet.toLocaleString('ru')} 🪙</div>
        <div class="pvp-player-pct">${pct}%</div>
      </div>
    </div>`;
  }).join('');

  // join / leave buttons
  const amIn   = g.players.find(p=>p.uid===UID);
  const canJoin= ['waiting','filling'].includes(g.state) && g.players.length < 10 && !amIn;
  document.getElementById('pvp-lobby-join-section').style.display = canJoin ? 'flex' : 'none';
  document.getElementById('pvp-leave-btn').style.display  = amIn ? 'block' : 'none';

  // timer
  if(g.state==='waiting'){
    stateEl.textContent='⏳ Ожидание игроков';
    timerEl.textContent='';
  } else {
    stateEl.textContent='🔥 Набор идёт!';
    (function tickFill(){
      const left = Math.max(0, g.fillEndsAt - Date.now());
      timerEl.textContent = Math.ceil(left/1000)+'с';
      if(left>0 && pvpState?.state==='filling') requestAnimationFrame(tickFill);
    })();
  }
}

/* ══ IN-GAME PLAYERS LIST ══ */
function renderIngamePlayers(g){
  const el    = document.getElementById('pvp-ingame-players');
  const totEl = document.getElementById('pvp-ingame-total');
  if(!el) return;
  totEl.textContent = 'Банк: ' + g.totalBet.toLocaleString('ru') + ' 🪙';
  el.innerHTML = g.players.map((p,i)=>{
    const pct  = ((p.bet/g.totalBet)*100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
      <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${PVP_COLORS[i%10]}"></div>
      <div style="flex:1;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${isMe?'👤 Вы':(p.username?'@'+p.username:p.firstName)}
      </div>
      <div style="font-size:11px;color:var(--muted2)">${pct}%</div>
      <div style="font-size:12px;font-weight:700;color:${PVP_COLORS[i%10]}">${p.bet.toLocaleString('ru')} 🪙</div>
    </div>`;
  }).join('');
}

/* ══ CANVAS ══ */
function ensureCanvas(g){
  if(!pvpCanvas){
    pvpCanvas = document.getElementById('pvp-canvas');
    pvpCtx    = pvpCanvas.getContext('2d');
  }
  const wrap = document.getElementById('pvp-ingame-block');
  const size = Math.min(wrap ? wrap.clientWidth - 16 : 290, 310);
  const dpr  = window.devicePixelRatio || 1;
  if(pvpCanvas._sz !== size){
    pvpCanvas.width  = size*dpr;
    pvpCanvas.height = size*dpr;
    pvpCanvas.style.width  = size+'px';
    pvpCanvas.style.height = size+'px';
    pvpCtx.setTransform(1,0,0,1,0,0);
    pvpCtx.scale(dpr, dpr);
    pvpCanvas._sz = size;
  }
}

/* ══ DRAW WHEEL ══ */
function drawWheel(g, rotation, countdownSec){
  if(!pvpCtx||!pvpCanvas) return;
  const sz     = pvpCanvas._sz || 300;
  const cx     = sz/2, cy = sz/2;
  const outerR = cx-4;
  const innerR = sz*0.19;
  const avatR  = sz*0.075;
  const total  = g.totalBet;

  pvpCtx.clearRect(0,0,sz,sz);

  // Glow
  const glow = pvpCtx.createRadialGradient(cx,cy,outerR-4,cx,cy,outerR+10);
  glow.addColorStop(0,'rgba(255,255,255,0.05)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  pvpCtx.beginPath(); pvpCtx.arc(cx,cy,outerR+10,0,Math.PI*2);
  pvpCtx.fillStyle=glow; pvpCtx.fill();

  // Base
  pvpCtx.beginPath(); pvpCtx.arc(cx,cy,outerR,0,Math.PI*2);
  pvpCtx.fillStyle='#111'; pvpCtx.fill();

  // Sectors + avatar positions
  let angle = rotation - Math.PI/2;
  const avatPos = [];

  g.players.forEach((p,i)=>{
    const slice = (p.bet/total)*Math.PI*2;
    const end   = angle+slice;
    const color = PVP_COLORS[i%10];

    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.arc(cx,cy,outerR,angle,end);
    pvpCtx.closePath();
    pvpCtx.fillStyle=color;
    pvpCtx.fill();

    // Divider
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.lineTo(cx+Math.cos(angle)*outerR, cy+Math.sin(angle)*outerR);
    pvpCtx.strokeStyle='rgba(0,0,0,0.55)';
    pvpCtx.lineWidth=2.5;
    pvpCtx.stroke();

    // Avatar position: 62% radius
    const mid  = angle+slice/2;
    const dist = outerR*0.62;
    avatPos.push({x:cx+Math.cos(mid)*dist, y:cy+Math.sin(mid)*dist, uid:p.uid, color,
                  initial:(p.username||p.firstName||'?')[0].toUpperCase()});
    angle = end;
  });

  // Center dark hole
  pvpCtx.beginPath(); pvpCtx.arc(cx,cy,innerR+4,0,Math.PI*2);
  pvpCtx.fillStyle='rgba(0,0,0,0.5)'; pvpCtx.fill();
  pvpCtx.beginPath(); pvpCtx.arc(cx,cy,innerR,0,Math.PI*2);
  pvpCtx.fillStyle='#0d0e0f'; pvpCtx.fill();
  pvpCtx.beginPath(); pvpCtx.arc(cx,cy,innerR,0,Math.PI*2);
  pvpCtx.strokeStyle='rgba(255,255,255,0.12)'; pvpCtx.lineWidth=1.5; pvpCtx.stroke();

  // Center text
  pvpCtx.save();
  pvpCtx.textAlign='center'; pvpCtx.textBaseline='middle';
  if(countdownSec !== null && countdownSec !== undefined){
    const m = String(Math.floor(countdownSec/60)).padStart(2,'0');
    const s = String(countdownSec%60).padStart(2,'0');
    pvpCtx.fillStyle='#fff';
    pvpCtx.font=`bold ${Math.round(innerR*0.62)}px -apple-system,monospace`;
    pvpCtx.fillText(m+':'+s, cx, cy);
  } else if(g.state==='done'){
    pvpCtx.font=`${Math.round(innerR*0.72)}px serif`;
    pvpCtx.fillText('🏆', cx, cy+1);
  }
  pvpCtx.restore();

  // Avatars (drawn on top of sectors)
  avatPos.forEach(a=>drawAvatar(a.x,a.y,avatR,a.uid,a.color,a.initial));

  // Pointer
  const pw=14, ph=20;
  pvpCtx.save();
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx-pw/2,2); pvpCtx.lineTo(cx+pw/2,2); pvpCtx.lineTo(cx,2+ph);
  pvpCtx.closePath();
  pvpCtx.fillStyle='#fff';
  pvpCtx.shadowColor='rgba(255,255,255,0.8)'; pvpCtx.shadowBlur=10;
  pvpCtx.fill(); pvpCtx.shadowBlur=0;
  pvpCtx.restore();
}

function drawAvatar(x, y, r, uid, color, initial){
  const img = pvpAvatarCache[uid];
  pvpCtx.save();

  // Colored ring
  pvpCtx.beginPath(); pvpCtx.arc(x,y,r+3,0,Math.PI*2);
  pvpCtx.fillStyle=color;
  pvpCtx.shadowColor=color; pvpCtx.shadowBlur=6;
  pvpCtx.fill(); pvpCtx.shadowBlur=0;

  // White border
  pvpCtx.beginPath(); pvpCtx.arc(x,y,r+1.5,0,Math.PI*2);
  pvpCtx.fillStyle='#fff'; pvpCtx.fill();

  // Clip
  pvpCtx.beginPath(); pvpCtx.arc(x,y,r,0,Math.PI*2); pvpCtx.clip();

  if(img && img.complete && img.naturalWidth){
    pvpCtx.drawImage(img,x-r,y-r,r*2,r*2);
  } else {
    // Fallback: colored bg + initial letter
    pvpCtx.fillStyle=color; pvpCtx.fillRect(x-r,y-r,r*2,r*2);
    pvpCtx.fillStyle='rgba(0,0,0,0.4)';
    pvpCtx.font=`bold ${Math.round(r*0.85)}px -apple-system,sans-serif`;
    pvpCtx.textAlign='center'; pvpCtx.textBaseline='middle';
    pvpCtx.fillStyle='#fff';
    pvpCtx.fillText(initial,x,y+0.5);
  }
  pvpCtx.restore();
}

/* ══ COUNTDOWN ANIMATION ══ */
function startCountdownDraw(g){
  cancelAnimationFrame(pvpCountdownRAF);
  function frame(){
    if(!pvpState || pvpState.state !== 'countdown'){ return; }
    const left = Math.max(0, Math.ceil((pvpState.countdownEndsAt-Date.now())/1000));
    drawWheel(g, 0, left);
    pvpCountdownRAF = requestAnimationFrame(frame);
  }
  frame();
}

/* ══ SPIN ANIMATION ══ */
function easeOutQuint(t){ return 1-Math.pow(1-t,5); }

function calcTargetRot(g){
  if(!g.winner) return Math.PI*2*7;
  const total = g.totalBet;
  let acc=0;
  for(const p of g.players){
    const slice=(p.bet/total)*Math.PI*2;
    if(p.uid===g.winner.uid) return Math.PI*2*7+(-acc-slice/2);
    acc+=slice;
  }
  return Math.PI*2*7;
}

function startSpinAnimation(g){
  const target   = calcTargetRot(g);
  const duration = 5200;
  const startT   = performance.now();

  function frame(now){
    const elapsed  = now-startT;
    const progress = Math.min(elapsed/duration,1);
    const rot      = easeOutQuint(progress)*target;
    const secLeft  = Math.max(0, Math.ceil((duration-elapsed)/1000));
    drawWheel(g, rot, secLeft);
    if(progress<1){
      pvpAnimFrame = requestAnimationFrame(frame);
    } else {
      pvpSpinning=false;
    }
  }
  pvpAnimFrame = requestAnimationFrame(frame);
}

/* ══ RESULT ══ */
function renderResult(g){
  const w    = g.winner;
  const isMe = w && w.uid===UID;
  const wIdx = g.players.findIndex(p=>p.uid===w?.uid);
  const wCol = PVP_COLORS[wIdx%10]||'var(--green)';

  if(isMe){ S.balance+=g.totalBet; syncB(); }

  document.getElementById('pvp-res-ico').textContent   = isMe?'🏆':'😔';
  document.getElementById('pvp-res-title').textContent  = isMe?'Вы победили!':'Победил другой';
  document.getElementById('pvp-res-name').innerHTML     = w
    ? `<span style="color:${wCol};font-weight:800">${w.username?'@'+w.username:w.firstName}</span> забирает ${g.totalBet.toLocaleString('ru')} 🪙`
    : '';
  const pe = document.getElementById('pvp-res-prize');
  pe.textContent = isMe?'+'+g.totalBet.toLocaleString('ru')+' монет!':'';
  pe.style.color = isMe?'var(--green)':'var(--muted2)';

  // Сохранить в историю
  addToHistory(g);

  // Отсчёт 5 сек → сбрасываем
  clearTimeout(pvpResultTimer);
  let left=5;
  const cdEl=document.getElementById('pvp-res-countdown');
  function tick(){
    if(cdEl) cdEl.textContent='Исчезнет через '+left+'с…';
    if(left<=0){
      document.getElementById('pvp-result-block').style.display='none';
      pvpState=null;
      pvpShownGameId=null;
      showPvpBlock('idle');
      renderHistoryBlock();
      return;
    }
    left--;
    pvpResultTimer=setTimeout(tick,1000);
  }
  tick();
}

/* ══ HISTORY ══ */
function addToHistory(g){
  const now=Date.now();
  // Чистим старше 1 часа
  pvpHistory=pvpHistory.filter(h=>now-h.finishedAt < 3600000);
  pvpHistory.unshift({
    id: g.id, finishedAt: now,
    playersCount: g.players.length,
    totalBet: g.totalBet,
    winner: g.winner,
    players: g.players,
  });
  // Макс 20 записей
  if(pvpHistory.length>20) pvpHistory=pvpHistory.slice(0,20);
}

function renderHistoryBlock(){
  const block   = document.getElementById('pvp-history-block');
  const listEl  = document.getElementById('pvp-history-list');
  if(!block||!listEl) return;
  // Чистим старше 1 часа
  pvpHistory=pvpHistory.filter(h=>Date.now()-h.finishedAt<3600000);
  if(!pvpHistory.length){ block.style.display='none'; return; }
  block.style.display='block';
  listEl.innerHTML=pvpHistory.map(h=>{
    const w    = h.winner;
    const wIdx = h.players?.findIndex(p=>p.uid===w?.uid)||0;
    const wCol = PVP_COLORS[wIdx%10]||'var(--green)';
    const t    = new Date(h.finishedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    return `<div class="gc" style="padding:10px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:11px;color:var(--muted2)">${t} · ${h.playersCount} игр.</div>
        <div style="font-size:12px;font-weight:700;color:var(--green)">${h.totalBet.toLocaleString('ru')} 🪙</div>
      </div>
      ${w?`<div style="font-size:12px;margin-top:4px">🏆 <span style="color:${wCol};font-weight:700">${w.username?'@'+w.username:w.firstName}</span></div>`:''}
    </div>`;
  }).join('');
}

/* ══ HELPERS ══ */
function stopAllPvpAnimations(){
  pvpSpinning=false;
  cancelAnimationFrame(pvpAnimFrame);
  cancelAnimationFrame(pvpCountdownRAF);
}

/* ══ JOIN / LEAVE ══ */
async function pvpJoin(){
  const inputId = pvpState ? 'pvp-bet-input2' : 'pvp-bet-input';
  const btnId   = pvpState ? 'pvp-join-btn2'  : 'pvp-join-btn';
  const input   = document.getElementById(inputId);
  const bet     = parseInt(input?.value||0);
  if(!bet||bet<PVP_MIN_BET){ toast('Минимум '+PVP_MIN_BET+' монет','r'); return; }
  if(bet>S.balance){ toast('Недостаточно монет','r'); return; }
  const btn=document.getElementById(btnId);
  btn.disabled=true; btn.textContent='...';
  try{
    const r=await fetch('/api/pvp/join',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'User',photoUrl:TGU.photo_url||'',bet})
    });
    const d=await r.json();
    if(d.ok){ S.balance-=bet; syncB(); input.value=''; await fetchPvpState(); toast('✅ В игре!','g'); }
    else toast(d.error||'Ошибка','r');
  }catch{ toast('Ошибка','r'); }
  btn.disabled=false; btn.textContent='⚔️ Участвовать';
}

// pvpJoin2 = тот же join для кнопки в лобби
function pvpJoin2(){ pvpJoin(); }

async function pvpLeave(){
  const btn=document.getElementById('pvp-leave-btn');
  btn.disabled=true;
  try{
    const r=await fetch('/api/pvp/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:UID})});
    const d=await r.json();
    if(d.ok){ S.balance+=d.refunded; syncB(); toast('↩️ Монеты возвращены','g'); await fetchPvpState(); }
    else toast(d.error||'Ошибка','r');
  }catch{ toast('Ошибка','r'); }
  btn.disabled=false;
}

/* ══ PAGE HOOKS ══ */
function onPvpPageEnter(){
  startPvpPolling();
  fetchPvpState();
  renderHistoryBlock();
}
function onPvpPageLeave(){}
