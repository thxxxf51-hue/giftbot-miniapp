/* ══ PvP WHEEL ══ */
const PVP_COLORS = [
  '#3df2a0','#e74c3c','#5b8def','#f39c12',
  '#9b59b6','#1cd1a1','#e67e22','#ff6fb7',
  '#00e5ff','#f4c430'
];
const PVP_MIN_BET = 50;

let pvpState        = null;
let pvpPollInterval = null;
let pvpSpinning     = false;
let pvpCanvas       = null;
let pvpCtx          = null;
let pvpAnimFrame    = null;
let pvpAvatarCache  = {};   // uid -> HTMLImageElement

/* ══ POLLING ══ */
function startPvpPolling(){
  if(pvpPollInterval) return;
  pvpPollInterval = setInterval(fetchPvpState, 1500);
  fetchPvpState();
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
    const prev = pvpState;
    pvpState = d.game;
    // Preload avatars whenever we get player data
    if(pvpState && pvpState.players) preloadAvatars(pvpState.players);
    renderPvpPage(prev);
  }catch{}
}

/* ══ AVATAR PRELOAD ══ */
function preloadAvatars(players){
  players.forEach(p => {
    if(p.photoUrl && !pvpAvatarCache[p.uid]){
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = p.photoUrl;
      img.onload = () => { pvpAvatarCache[p.uid] = img; };
      img.onerror = () => { pvpAvatarCache[p.uid] = null; };
    }
  });
}

/* ══ RENDER PAGE ══ */
function renderPvpPage(prev){
  if(curPage !== 'pvp') return;
  const game = pvpState;

  const lobbyEl   = document.getElementById('pvp-lobby');
  const emptyEl   = document.getElementById('pvp-empty');
  const wheelWrap = document.getElementById('pvp-wheel-wrap');
  const resultEl  = document.getElementById('pvp-result');
  const joinWrap  = document.getElementById('pvp-join-wrap');
  if(!lobbyEl) return;

  if(!game){
    pvpSpinning = false;
    cancelAnimationFrame(pvpAnimFrame);
    lobbyEl.style.display   = 'none';
    wheelWrap.style.display = 'none';
    resultEl.style.display  = 'none';
    emptyEl.style.display   = 'flex';
    joinWrap.style.display  = 'block';
    renderPvpJoin(null);
    return;
  }

  emptyEl.style.display = 'none';

  if(game.state === 'spinning' || game.state === 'done'){
    lobbyEl.style.display   = 'none';
    joinWrap.style.display  = 'none';
    wheelWrap.style.display = 'flex';

    if(game.state === 'spinning' && !pvpSpinning){
      pvpSpinning = true;
      initCanvas(game);
      startSpinAnimation(game);
    }
    if(game.state === 'done'){
      if(pvpSpinning){ pvpSpinning = false; cancelAnimationFrame(pvpAnimFrame); }
      initCanvas(game);
      drawWheel(game, calcTargetRot(game), 'done');
      resultEl.style.display = 'flex';
      showPvpResult(game);
    }
    return;
  }

  // countdown state — show wheel with live countdown
  if(game.state === 'countdown'){
    lobbyEl.style.display   = 'none';
    joinWrap.style.display  = 'none';
    wheelWrap.style.display = 'flex';
    initCanvas(game);
    startCountdownDraw(game);
    return;
  }

  // waiting / filling
  wheelWrap.style.display = 'none';
  resultEl.style.display  = 'none';
  lobbyEl.style.display   = 'block';
  joinWrap.style.display  = 'block';

  renderPvpLobby(game);
  renderPvpJoin(game);
  updatePvpTimers(game);
}

function renderPvpLobby(game){
  const list = document.getElementById('pvp-players-list');
  if(!list) return;
  list.innerHTML = game.players.map((p,i)=>{
    const pct = ((p.bet/game.totalBet)*100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div class="pvp-player-row">
      <div class="pvp-player-dot" style="background:${PVP_COLORS[i%10]};box-shadow:0 0 6px ${PVP_COLORS[i%10]}88"></div>
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
  document.getElementById('pvp-total').textContent = game.totalBet.toLocaleString('ru') + ' 🪙';
  document.getElementById('pvp-count').textContent = game.players.length + ' / 10';
}

function renderPvpJoin(game){
  const amInGame = game && game.players.find(p=>p.uid===UID);
  const joinSec  = document.getElementById('pvp-join-section');
  const leaveBtn = document.getElementById('pvp-leave-btn');
  if(!joinSec) return;
  const canJoin = !game || (['waiting','filling'].includes(game.state) && game.players.length < 10);
  if(amInGame){
    joinSec.style.display  = 'none';
    leaveBtn.style.display = 'block';
  } else if(canJoin){
    joinSec.style.display  = 'flex';
    leaveBtn.style.display = 'none';
  } else {
    joinSec.style.display  = 'none';
    leaveBtn.style.display = 'none';
  }
}

let _pvpTimerRAF = null;
function updatePvpTimers(game){
  cancelAnimationFrame(_pvpTimerRAF);
  const timerEl = document.getElementById('pvp-timer');
  const stateEl = document.getElementById('pvp-state-label');
  if(!timerEl||!stateEl) return;
  if(game.state==='waiting'){
    stateEl.textContent='⏳ Ожидание игроков';
    timerEl.textContent='';
  } else if(game.state==='filling'){
    stateEl.textContent='🔥 Набор идёт!';
    (function tick(){
      const left=Math.max(0,game.fillEndsAt-Date.now());
      timerEl.textContent=Math.ceil(left/1000)+'с';
      if(left>0&&pvpState?.state==='filling') _pvpTimerRAF=requestAnimationFrame(tick);
    })();
  }
}

/* ══ JOIN / LEAVE ══ */
async function pvpJoin(){
  const input = document.getElementById('pvp-bet-input');
  const bet   = parseInt(input?.value||0);
  if(!bet||bet<PVP_MIN_BET){ toast(`Минимум ${PVP_MIN_BET} монет`,'r'); return; }
  if(bet>S.balance){ toast('Недостаточно монет','r'); return; }
  const btn = document.getElementById('pvp-join-btn');
  btn.disabled=true; btn.textContent='...';
  try{
    const r = await fetch('/api/pvp/join',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        userId: UID,
        username: TGU.username||'',
        firstName: TGU.first_name||'User',
        photoUrl: TGU.photo_url||'',
        bet
      })
    });
    const d = await r.json();
    if(d.ok){ S.balance-=bet; syncB(); input.value=''; await fetchPvpState(); toast('✅ Вы в игре!','g'); }
    else toast(d.error||'Ошибка','r');
  }catch{ toast('Ошибка соединения','r'); }
  btn.disabled=false; btn.textContent='⚔️ Участвовать';
}

async function pvpLeave(){
  const btn = document.getElementById('pvp-leave-btn');
  btn.disabled=true;
  try{
    const r = await fetch('/api/pvp/leave',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID})
    });
    const d = await r.json();
    if(d.ok){ S.balance+=d.refunded; syncB(); toast('↩️ Монеты возвращены','g'); await fetchPvpState(); }
    else toast(d.error||'Ошибка','r');
  }catch{ toast('Ошибка','r'); }
  btn.disabled=false;
}

/* ══ CANVAS INIT ══ */
function initCanvas(game){
  if(!pvpCanvas){
    pvpCanvas = document.getElementById('pvp-canvas');
    pvpCtx    = pvpCanvas.getContext('2d');
  }
  const wrap = document.getElementById('pvp-wheel-wrap');
  const size = Math.min(wrap ? wrap.clientWidth - 16 : 290, 310);
  const dpr  = window.devicePixelRatio || 1;
  pvpCanvas.width        = size * dpr;
  pvpCanvas.height       = size * dpr;
  pvpCanvas.style.width  = size + 'px';
  pvpCanvas.style.height = size + 'px';
  pvpCtx.setTransform(1,0,0,1,0,0);
  pvpCtx.scale(dpr, dpr);
  pvpCanvas._sz = size;
}

/* ══ DRAW WHEEL ══ */
function drawWheel(game, rotation, phase, countdownSec){
  if(!pvpCtx||!pvpCanvas) return;
  const sz      = pvpCanvas._sz || 300;
  const cx      = sz/2, cy = sz/2;
  const outerR  = cx - 6;
  const innerR  = sz * 0.175;   // center circle radius
  const avatarR = sz * 0.072;   // avatar circle radius
  const players = game.players;
  const total   = game.totalBet;

  pvpCtx.clearRect(0, 0, sz, sz);

  // ── Outer glow ring ──
  const glowGrd = pvpCtx.createRadialGradient(cx,cy,outerR-2,cx,cy,outerR+8);
  glowGrd.addColorStop(0, 'rgba(255,255,255,0.06)');
  glowGrd.addColorStop(1, 'rgba(0,0,0,0)');
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,outerR+8,0,Math.PI*2);
  pvpCtx.fillStyle=glowGrd;
  pvpCtx.fill();

  // ── Dark base circle ──
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,outerR,0,Math.PI*2);
  pvpCtx.fillStyle='#111';
  pvpCtx.fill();

  // ── Sectors ──
  let angle = rotation - Math.PI/2;
  const avatarPositions = [];

  players.forEach((p,i)=>{
    const slice = (p.bet/total)*Math.PI*2;
    const end   = angle+slice;
    const color = PVP_COLORS[i%10];

    // Sector fill
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.arc(cx,cy,outerR,angle,end);
    pvpCtx.closePath();
    pvpCtx.fillStyle = color;
    pvpCtx.fill();

    // Divider
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.lineTo(cx+Math.cos(angle)*outerR, cy+Math.sin(angle)*outerR);
    pvpCtx.strokeStyle='rgba(0,0,0,0.6)';
    pvpCtx.lineWidth=2.5;
    pvpCtx.stroke();

    // Avatar position (mid of sector, 62% radius)
    const mid  = angle + slice/2;
    const dist = outerR * 0.62;
    avatarPositions.push({ x: cx+Math.cos(mid)*dist, y: cy+Math.sin(mid)*dist, uid: p.uid, color });

    angle = end;
  });

  // ── Center dark circle ──
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,innerR+3,0,Math.PI*2);
  pvpCtx.fillStyle='rgba(0,0,0,0.55)';
  pvpCtx.fill();

  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,innerR,0,Math.PI*2);
  pvpCtx.fillStyle='#0d0e0f';
  pvpCtx.fill();

  // Center ring border
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,innerR,0,Math.PI*2);
  pvpCtx.strokeStyle='rgba(255,255,255,0.15)';
  pvpCtx.lineWidth=2;
  pvpCtx.stroke();

  // ── Center countdown / icon ──
  pvpCtx.save();
  pvpCtx.textAlign='center';
  pvpCtx.textBaseline='middle';
  if(countdownSec !== undefined){
    const mins = String(Math.floor(countdownSec/60)).padStart(2,'0');
    const secs = String(countdownSec%60).padStart(2,'0');
    pvpCtx.fillStyle='#ffffff';
    pvpCtx.font=`bold ${Math.round(innerR*0.58)}px -apple-system,monospace`;
    pvpCtx.fillText(mins+':'+secs, cx, cy);
  } else if(phase==='done' && game.winner){
    pvpCtx.fillStyle='#FFD700';
    pvpCtx.font=`bold ${Math.round(innerR*0.52)}px -apple-system`;
    pvpCtx.fillText('🏆', cx, cy);
  } else {
    // sword icon
    pvpCtx.strokeStyle='rgba(255,255,255,0.5)';
    pvpCtx.lineWidth=2;
    pvpCtx.lineCap='round';
    const s=innerR*0.45;
    pvpCtx.beginPath(); pvpCtx.moveTo(cx-s,cy-s); pvpCtx.lineTo(cx+s,cy+s); pvpCtx.stroke();
    pvpCtx.beginPath(); pvpCtx.moveTo(cx-s*0.5,cy+s*0.5); pvpCtx.lineTo(cx+s*0.5,cy-s*0.5); pvpCtx.stroke();
  }
  pvpCtx.restore();

  // ── Avatars on top of sectors ──
  avatarPositions.forEach(({x,y,uid,color})=>{
    drawAvatar(x,y,avatarR,uid,color);
  });

  // ── Pointer triangle at top ──
  const pw=14, ph=20;
  pvpCtx.save();
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx-pw/2, 2);
  pvpCtx.lineTo(cx+pw/2, 2);
  pvpCtx.lineTo(cx, 2+ph);
  pvpCtx.closePath();
  pvpCtx.fillStyle='#ffffff';
  pvpCtx.shadowColor='rgba(255,255,255,0.8)';
  pvpCtx.shadowBlur=10;
  pvpCtx.fill();
  pvpCtx.restore();
}

function drawAvatar(x, y, r, uid, borderColor){
  const img = pvpAvatarCache[uid];
  pvpCtx.save();

  // White border + color glow
  pvpCtx.beginPath();
  pvpCtx.arc(x,y,r+3,0,Math.PI*2);
  pvpCtx.fillStyle=borderColor;
  pvpCtx.shadowColor=borderColor;
  pvpCtx.shadowBlur=8;
  pvpCtx.fill();
  pvpCtx.shadowBlur=0;

  pvpCtx.beginPath();
  pvpCtx.arc(x,y,r+1.5,0,Math.PI*2);
  pvpCtx.fillStyle='#fff';
  pvpCtx.fill();

  // Clip circle for avatar
  pvpCtx.beginPath();
  pvpCtx.arc(x,y,r,0,Math.PI*2);
  pvpCtx.clip();

  if(img){
    pvpCtx.drawImage(img, x-r, y-r, r*2, r*2);
  } else {
    // Fallback — colored circle
    pvpCtx.fillStyle=borderColor;
    pvpCtx.fillRect(x-r,y-r,r*2,r*2);
    pvpCtx.fillStyle='rgba(0,0,0,0.3)';
    pvpCtx.font=`bold ${Math.round(r*0.8)}px -apple-system`;
    pvpCtx.textAlign='center';
    pvpCtx.textBaseline='middle';
    pvpCtx.fillStyle='#fff';
    pvpCtx.fillText('?',x,y);
  }
  pvpCtx.restore();
}

/* ══ COUNTDOWN DRAW (before spin) ══ */
let _cdDrawRAF = null;
function startCountdownDraw(game){
  cancelAnimationFrame(_cdDrawRAF);
  function frame(){
    if(!pvpState||pvpState.state!=='countdown'){ return; }
    const left = Math.max(0, Math.ceil((pvpState.countdownEndsAt - Date.now())/1000));
    drawWheel(game, 0, 'countdown', left);
    _cdDrawRAF = requestAnimationFrame(frame);
  }
  frame();
}

/* ══ SPIN ANIMATION ══ */
function calcTargetRot(game){
  if(!game.winner) return Math.PI*2*7;
  const total = game.totalBet;
  let acc=0;
  for(const p of game.players){
    const slice=(p.bet/total)*Math.PI*2;
    if(p.uid===game.winner.uid){
      return Math.PI*2*7 + (-acc - slice/2);
    }
    acc+=slice;
  }
  return Math.PI*2*7;
}

function easeOutQuint(t){ return 1-Math.pow(1-t,5); }

function startSpinAnimation(game){
  const target   = calcTargetRot(game);
  const duration = 5200;
  const start    = performance.now();

  function frame(now){
    const elapsed  = now-start;
    const progress = Math.min(elapsed/duration,1);
    const eased    = easeOutQuint(progress);
    const rot      = eased*target;
    const secLeft  = Math.max(0, Math.ceil((duration-elapsed)/1000));
    drawWheel(game, rot, 'spinning', secLeft);
    if(progress<1){
      pvpAnimFrame = requestAnimationFrame(frame);
    } else {
      pvpSpinning=false;
    }
  }
  pvpAnimFrame = requestAnimationFrame(frame);
}

/* ══ RESULT ══ */
let _pvpResultTimer  = null;
let _pvpResultShown  = false;

function showPvpResult(game){
  if(_pvpResultShown) return;
  _pvpResultShown=true;
  const el = document.getElementById('pvp-result');
  if(!el||!game.winner) return;
  const w    = game.winner;
  const isMe = w.uid===UID;
  const wIdx = game.players.findIndex(p=>p.uid===w.uid);
  const wCol = PVP_COLORS[wIdx%10];

  if(isMe){ S.balance+=game.totalBet; syncB(); }

  document.getElementById('pvp-res-ico').textContent   = isMe?'🏆':'😔';
  document.getElementById('pvp-res-title').textContent  = isMe?'Вы победили!':'Победил другой';
  document.getElementById('pvp-res-name').innerHTML     =
    `<span style="color:${wCol};font-weight:800">${w.username?'@'+w.username:w.firstName}</span> забирает ${game.totalBet.toLocaleString('ru')} 🪙`;
  const prizeEl=document.getElementById('pvp-res-prize');
  prizeEl.textContent=isMe?'+'+game.totalBet.toLocaleString('ru')+' монет!':'';
  prizeEl.style.color=isMe?'var(--green)':'var(--muted2)';

  let left=5;
  const cdEl=document.getElementById('pvp-res-countdown');
  function tick(){
    if(cdEl) cdEl.textContent='Обновление через '+left+'с…';
    if(left<=0){
      savePvpStats(game);
      pvpState=null; _pvpResultShown=false;
      renderPvpPage(game); return;
    }
    left--;
    _pvpResultTimer=setTimeout(tick,1000);
  }
  tick();
}

function savePvpStats(game){
  const statsEl   = document.getElementById('pvp-stats');
  const playersEl = document.getElementById('pvp-stat-players');
  const totalEl   = document.getElementById('pvp-stat-total');
  const winnerEl  = document.getElementById('pvp-stat-winner');
  if(!statsEl||!game.winner) return;
  playersEl.textContent = game.players.length+' чел.';
  totalEl.textContent   = game.totalBet.toLocaleString('ru')+' 🪙';
  const w=game.winner;
  winnerEl.textContent  = (w.username?'@'+w.username:w.firstName)+' +'+game.totalBet.toLocaleString('ru')+' 🪙';
  statsEl.style.display='block';
}

/* ══ PAGE HOOKS ══ */
function onPvpPageEnter(){ startPvpPolling(); fetchPvpState(); }
function onPvpPageLeave(){}
