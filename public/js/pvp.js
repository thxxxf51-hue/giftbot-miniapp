/* ══ PvP WHEEL ══ */
const PVP_COLORS = [
  '#2ecc71','#e74c3c','#5b8def','#f39c12',
  '#9b59b6','#1abc9c','#e67e22','#ff6fb7',
  '#00e5ff','#f4c430'
];
const PVP_MIN_BET = 50;

let pvpState      = null;
let pvpPollInterval = null;
let pvpSpinning   = false;
let pvpCanvas     = null;
let pvpCtx        = null;
let pvpAnimFrame  = null;
let pvpCurrentRot = 0;   // current rotation in radians
let pvpTargetRot  = 0;
let pvpSpinStart  = 0;
let pvpSpinDuration = 5000;

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
    renderPvpPage(prev);
  }catch{}
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
    lobbyEl.style.display  = 'none';
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
      const target = calcTargetRot(game);
      drawWheel(game, target);
      resultEl.style.display = 'flex';
      showPvpResult(game);
    }
    return;
  }

  // waiting / filling / countdown
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
    const pct = ((p.bet / game.totalBet)*100).toFixed(1);
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
  const amInGame   = game && game.players.find(p=>p.uid===UID);
  const joinSec    = document.getElementById('pvp-join-section');
  const leaveBtn   = document.getElementById('pvp-leave-btn');
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
  } else if(game.state==='countdown'){
    stateEl.textContent='🚀 Игра начинается!';
    (function tick2(){
      const left=Math.max(0,game.countdownEndsAt-Date.now());
      timerEl.textContent=Math.ceil(left/1000)+'...';
      if(left>0&&pvpState?.state==='countdown') _pvpTimerRAF=requestAnimationFrame(tick2);
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
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'User',bet})
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
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID})
    });
    const d = await r.json();
    if(d.ok){ S.balance+=d.refunded; syncB(); toast('↩️ Монеты возвращены','g'); await fetchPvpState(); }
    else toast(d.error||'Ошибка','r');
  }catch{ toast('Ошибка','r'); }
  btn.disabled=false;
}

/* ══ CANVAS — CRISP & SMOOTH ══ */
function initCanvas(game){
  if(!pvpCanvas){
    pvpCanvas = document.getElementById('pvp-canvas');
    pvpCtx    = pvpCanvas.getContext('2d');
  }
  const wrap = document.getElementById('pvp-wheel-wrap');
  const size = Math.min(wrap ? wrap.clientWidth - 20 : 280, 300);
  const dpr  = window.devicePixelRatio || 1;

  // Physical pixels = size * dpr → crisp on retina
  pvpCanvas.width  = size * dpr;
  pvpCanvas.height = size * dpr;
  pvpCanvas.style.width  = size + 'px';
  pvpCanvas.style.height = size + 'px';
  pvpCtx.scale(dpr, dpr);
  pvpCanvas._logicalSize = size;
}

function drawWheel(game, rotation){
  if(!pvpCtx||!pvpCanvas) return;
  const sz = pvpCanvas._logicalSize || pvpCanvas.width;
  const cx = sz/2, cy = sz/2;
  const outerR = cx - 4;
  const innerR = 18;  // center hole
  const players = game.players;
  const total   = game.totalBet;

  pvpCtx.clearRect(0,0,sz,sz);

  // Outer ring glow
  const grd = pvpCtx.createRadialGradient(cx,cy,outerR-6,cx,cy,outerR+4);
  grd.addColorStop(0,'rgba(46,204,113,0.25)');
  grd.addColorStop(1,'rgba(46,204,113,0)');
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,outerR+4,0,Math.PI*2);
  pvpCtx.fillStyle=grd;
  pvpCtx.fill();

  // Track BG
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,outerR,0,Math.PI*2);
  pvpCtx.fillStyle='#111213';
  pvpCtx.fill();

  // Sectors
  let angle = rotation - Math.PI/2;
  players.forEach((p,i)=>{
    const slice  = (p.bet/total)*Math.PI*2;
    const endAng = angle+slice;
    const color  = PVP_COLORS[i%10];

    // Main sector
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.arc(cx,cy,outerR,angle,endAng);
    pvpCtx.closePath();
    pvpCtx.fillStyle=color;
    pvpCtx.fill();

    // Subtle lighter edge
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.arc(cx,cy,outerR,angle,endAng);
    pvpCtx.closePath();
    pvpCtx.strokeStyle='rgba(255,255,255,0.12)';
    pvpCtx.lineWidth=1;
    pvpCtx.stroke();

    // Separator line
    pvpCtx.save();
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx,cy);
    pvpCtx.lineTo(cx+Math.cos(angle)*outerR, cy+Math.sin(angle)*outerR);
    pvpCtx.strokeStyle='rgba(0,0,0,0.5)';
    pvpCtx.lineWidth=2;
    pvpCtx.stroke();
    pvpCtx.restore();

    // Label inside sector
    if(slice > 0.25){
      const mid  = angle+slice/2;
      const dist = outerR*0.62;
      const lx   = cx+Math.cos(mid)*dist;
      const ly   = cy+Math.sin(mid)*dist;
      const name = (p.username?'@'+p.username:p.firstName)||'?';
      const label= name.length>9?name.slice(0,8)+'…':name;
      const fs   = Math.max(8, Math.min(11, Math.floor(slice*10)));

      pvpCtx.save();
      pvpCtx.translate(lx,ly);
      pvpCtx.rotate(mid+Math.PI/2);
      pvpCtx.fillStyle='rgba(0,0,0,0.45)';
      pvpCtx.font=`bold ${fs}px -apple-system,sans-serif`;
      pvpCtx.textAlign='center';
      pvpCtx.textBaseline='middle';
      pvpCtx.fillText(label,1,1);
      pvpCtx.fillStyle='#fff';
      pvpCtx.fillText(label,0,0);
      pvpCtx.restore();
    }

    angle = endAng;
  });

  // Center circle
  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,innerR+6,0,Math.PI*2);
  pvpCtx.fillStyle='#0a0a0a';
  pvpCtx.fill();

  pvpCtx.beginPath();
  pvpCtx.arc(cx,cy,innerR+6,0,Math.PI*2);
  pvpCtx.strokeStyle='rgba(255,255,255,0.08)';
  pvpCtx.lineWidth=1.5;
  pvpCtx.stroke();

  // Sword icon in center (SVG-style drawn with canvas)
  drawSwordIcon(cx, cy, 10);

  // Pointer arrow at top
  const pw=11, ph=18;
  pvpCtx.save();
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx-pw/2, ph+2);
  pvpCtx.lineTo(cx+pw/2, ph+2);
  pvpCtx.lineTo(cx,      ph+2+ph*0.8);
  pvpCtx.closePath();
  pvpCtx.fillStyle='#ffffff';
  pvpCtx.shadowColor='rgba(255,255,255,0.7)';
  pvpCtx.shadowBlur=8;
  pvpCtx.fill();
  pvpCtx.shadowBlur=0;
  pvpCtx.restore();
}

function drawSwordIcon(cx, cy, r){
  pvpCtx.save();
  pvpCtx.strokeStyle='rgba(255,255,255,0.7)';
  pvpCtx.lineWidth=1.5;
  pvpCtx.lineCap='round';
  // Blade (diagonal line)
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx-r*0.6, cy-r*0.6);
  pvpCtx.lineTo(cx+r*0.6, cy+r*0.6);
  pvpCtx.stroke();
  // Guard (cross)
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx-r*0.4, cy+r*0.4);
  pvpCtx.lineTo(cx+r*0.4, cy-r*0.4);
  pvpCtx.stroke();
  pvpCtx.restore();
}

/* ══ SPIN ANIMATION ══ */
function calcTargetRot(game){
  if(!game.winner) return Math.PI*2*6;
  const total = game.totalBet;
  let acc=0;
  for(const p of game.players){
    const slice=(p.bet/total)*Math.PI*2;
    if(p.uid===game.winner.uid){
      const mid=acc+slice/2;
      return Math.PI*2*6 + (-mid); // 6 full spins + land on winner
    }
    acc+=slice;
  }
  return Math.PI*2*6;
}

function easeOutQuint(t){ return 1-Math.pow(1-t,5); }

function startSpinAnimation(game){
  const target   = calcTargetRot(game);
  const duration = 5200;
  const start    = performance.now();

  function frame(now){
    const elapsed  = now - start;
    const progress = Math.min(elapsed/duration, 1);
    const eased    = easeOutQuint(progress);
    const rot      = eased * target;
    drawWheel(game, rot);

    if(progress < 1){
      pvpAnimFrame = requestAnimationFrame(frame);
    } else {
      pvpSpinning = false;
    }
  }
  pvpAnimFrame = requestAnimationFrame(frame);
}

/* ══ RESULT ══ */
function showPvpResult(game){
  const el = document.getElementById('pvp-result');
  if(!el||!game.winner) return;
  const w     = game.winner;
  const isMe  = w.uid === UID;
  const wIdx  = game.players.findIndex(p=>p.uid===w.uid);
  const wColor= PVP_COLORS[wIdx%10];

  if(isMe){ S.balance+=game.totalBet; syncB(); }

  document.getElementById('pvp-res-ico').textContent   = isMe?'🏆':'😔';
  document.getElementById('pvp-res-title').textContent  = isMe?'Вы победили!':'Победил другой';
  document.getElementById('pvp-res-name').innerHTML     =
    `<span style="color:${wColor};font-weight:800">${w.username?'@'+w.username:w.firstName}</span> забирает ${game.totalBet.toLocaleString('ru')} 🪙`;
  const prizeEl = document.getElementById('pvp-res-prize');
  prizeEl.textContent = isMe?'+'+game.totalBet.toLocaleString('ru')+' монет!':'';
  prizeEl.style.color = isMe?'var(--green)':'var(--muted2)';
}

/* ══ PAGE HOOKS ══ */
function onPvpPageEnter(){ startPvpPolling(); fetchPvpState(); }
function onPvpPageLeave(){ /* keep polling */ }
