/* ══ PvP WHEEL ══ */
const PVP_COLORS = ['#2ecc71','#e74c3c','#5b8def','#f39c12','#9b59b6','#1abc9c','#e67e22','#ff6fb7','#00e5ff','#f4c430'];
const PVP_MIN_BET = 50;

let pvpState = null;       // последнее известное состояние игры
let pvpPollInterval = null;
let pvpSpinning = false;
let pvpCanvas = null;
let pvpCtx = null;
let pvpAnimFrame = null;
let pvpCurrentRotation = 0;

/* ══ POLLING ══ */
function startPvpPolling() {
  if (pvpPollInterval) return;
  pvpPollInterval = setInterval(fetchPvpState, 1500);
  fetchPvpState();
}
function stopPvpPolling() {
  clearInterval(pvpPollInterval);
  pvpPollInterval = null;
}

async function fetchPvpState() {
  try {
    const r = await fetch('/api/pvp/state');
    const d = await r.json();
    if (!d.ok) return;
    const prev = pvpState;
    pvpState = d.game;
    renderPvpPage(prev);
  } catch {}
}

/* ══ RENDER ══ */
function renderPvpPage(prev) {
  if (curPage !== 'pvp') return;
  const game = pvpState;

  const lobbyEl = document.getElementById('pvp-lobby');
  const emptyEl = document.getElementById('pvp-empty');
  const wheelWrap = document.getElementById('pvp-wheel-wrap');
  const resultEl = document.getElementById('pvp-result');
  if (!lobbyEl) return;

  // Нет игры
  if (!game) {
    pvpSpinning = false;
    cancelAnimationFrame(pvpAnimFrame);
    lobbyEl.style.display = 'none';
    wheelWrap.style.display = 'none';
    resultEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    renderPvpJoin(null);
    return;
  }

  emptyEl.style.display = 'none';

  if (game.state === 'spinning' || game.state === 'done') {
    lobbyEl.style.display = 'none';
    wheelWrap.style.display = 'flex';

    // Запустить анимацию один раз
    if (game.state === 'spinning' && !pvpSpinning) {
      pvpSpinning = true;
      initCanvas(game);
      animateSpin(game);
    }
    if (game.state === 'done') {
      pvpSpinning = false;
      cancelAnimationFrame(pvpAnimFrame);
      initCanvas(game);
      drawWheel(game, calcTargetAngle(game));
      showPvpResult(game);
      resultEl.style.display = 'flex';
    }
    return;
  }

  // waiting / filling / countdown
  wheelWrap.style.display = 'none';
  resultEl.style.display = 'none';
  lobbyEl.style.display = 'block';

  renderPvpLobby(game);
  renderPvpJoin(game);

  // Таймеры
  updatePvpTimers(game);
}

function renderPvpLobby(game) {
  const list = document.getElementById('pvp-players-list');
  if (!list) return;

  list.innerHTML = game.players.map((p, i) => {
    const pct = ((p.bet / game.totalBet) * 100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div class="pvp-player-row">
      <div class="pvp-player-dot" style="background:${PVP_COLORS[i % 10]}"></div>
      <div class="pvp-player-info">
        <div class="pvp-player-name">${isMe ? '👤 Вы' : (p.username ? '@'+p.username : p.firstName)}</div>
        <div class="pvp-player-bar-wrap">
          <div class="pvp-player-bar" style="width:${pct}%;background:${PVP_COLORS[i % 10]}"></div>
        </div>
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

function renderPvpJoin(game) {
  const amInGame = game && game.players.find(p => p.uid === UID);
  const joinSection = document.getElementById('pvp-join-section');
  const leaveBtn = document.getElementById('pvp-leave-btn');
  const joinBtn = document.getElementById('pvp-join-btn');
  const betInput = document.getElementById('pvp-bet-input');
  if (!joinSection) return;

  const canJoin = !game || (['waiting','filling'].includes(game.state) && game.players.length < 10);

  if (amInGame) {
    joinSection.style.display = 'none';
    leaveBtn.style.display = 'block';
  } else if (canJoin && game && !['spinning','countdown','done'].includes(game.state)) {
    joinSection.style.display = 'flex';
    leaveBtn.style.display = 'none';
  } else if (!game) {
    joinSection.style.display = 'flex';
    leaveBtn.style.display = 'none';
  } else {
    joinSection.style.display = 'none';
    leaveBtn.style.display = 'none';
  }
}

let _pvpTimerRAF = null;
function updatePvpTimers(game) {
  cancelAnimationFrame(_pvpTimerRAF);
  const timerEl = document.getElementById('pvp-timer');
  const stateEl = document.getElementById('pvp-state-label');
  if (!timerEl || !stateEl) return;

  if (game.state === 'waiting') {
    stateEl.textContent = '⏳ Ожидание игроков';
    timerEl.textContent = '';
  } else if (game.state === 'filling') {
    stateEl.textContent = '🔥 Набор идёт!';
    function tick() {
      const left = Math.max(0, game.fillEndsAt - Date.now());
      timerEl.textContent = Math.ceil(left / 1000) + 'с';
      if (left > 0 && pvpState?.state === 'filling') {
        _pvpTimerRAF = requestAnimationFrame(tick);
      }
    }
    tick();
  } else if (game.state === 'countdown') {
    stateEl.textContent = '🚀 Игра начинается!';
    function tick2() {
      const left = Math.max(0, game.countdownEndsAt - Date.now());
      timerEl.textContent = Math.ceil(left / 1000) + '...';
      if (left > 0 && pvpState?.state === 'countdown') {
        _pvpTimerRAF = requestAnimationFrame(tick2);
      }
    }
    tick2();
  }
}

/* ══ JOIN / LEAVE ══ */
async function pvpJoin() {
  const input = document.getElementById('pvp-bet-input');
  const bet = parseInt(input?.value || 0);
  if (!bet || bet < PVP_MIN_BET) { toast(`Минимальная ставка ${PVP_MIN_BET} монет`, 'r'); return; }
  if (bet > S.balance) { toast('Недостаточно монет', 'r'); return; }

  const btn = document.getElementById('pvp-join-btn');
  btn.disabled = true; btn.textContent = '...';

  try {
    const r = await fetch('/api/pvp/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: UID, username: TGU.username || '', firstName: TGU.first_name || 'User', bet })
    });
    const d = await r.json();
    if (d.ok) {
      S.balance -= bet; syncB();
      input.value = '';
      await fetchPvpState();
      toast('✅ Вы в игре!', 'g');
    } else {
      toast(d.error || 'Ошибка', 'r');
    }
  } catch { toast('Ошибка соединения', 'r'); }
  btn.disabled = false; btn.textContent = '⚔️ Участвовать';
}

async function pvpLeave() {
  const btn = document.getElementById('pvp-leave-btn');
  btn.disabled = true;
  try {
    const r = await fetch('/api/pvp/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: UID })
    });
    const d = await r.json();
    if (d.ok) {
      S.balance += d.refunded; syncB();
      toast('↩️ Вы вышли, монеты возвращены', 'g');
      await fetchPvpState();
    } else { toast(d.error || 'Ошибка', 'r'); }
  } catch { toast('Ошибка', 'r'); }
  btn.disabled = false;
}

/* ══ CANVAS WHEEL ══ */
function initCanvas(game) {
  if (!pvpCanvas) {
    pvpCanvas = document.getElementById('pvp-canvas');
    pvpCtx = pvpCanvas.getContext('2d');
  }
  const size = Math.min(window.innerWidth - 40, 300);
  pvpCanvas.width = size;
  pvpCanvas.height = size;
}

function drawWheel(game, rotation) {
  if (!pvpCtx || !pvpCanvas) return;
  const cx = pvpCanvas.width / 2;
  const cy = pvpCanvas.height / 2;
  const r = cx - 8;
  const players = game.players;
  const total = game.totalBet;

  pvpCtx.clearRect(0, 0, pvpCanvas.width, pvpCanvas.height);

  // Shadow
  pvpCtx.save();
  pvpCtx.shadowColor = 'rgba(46,204,113,0.2)';
  pvpCtx.shadowBlur = 20;
  pvpCtx.beginPath();
  pvpCtx.arc(cx, cy, r, 0, Math.PI * 2);
  pvpCtx.fillStyle = '#1a1c1e';
  pvpCtx.fill();
  pvpCtx.restore();

  let startAngle = rotation - Math.PI / 2;

  players.forEach((p, i) => {
    const slice = (p.bet / total) * Math.PI * 2;
    const endAngle = startAngle + slice;
    const color = PVP_COLORS[i % 10];

    // Sector
    pvpCtx.beginPath();
    pvpCtx.moveTo(cx, cy);
    pvpCtx.arc(cx, cy, r, startAngle, endAngle);
    pvpCtx.closePath();
    pvpCtx.fillStyle = color;
    pvpCtx.fill();
    pvpCtx.strokeStyle = '#0a0a0a';
    pvpCtx.lineWidth = 2;
    pvpCtx.stroke();

    // Label (only if sector large enough)
    if (slice > 0.3) {
      const midAngle = startAngle + slice / 2;
      const lx = cx + (r * 0.62) * Math.cos(midAngle);
      const ly = cy + (r * 0.62) * Math.sin(midAngle);
      pvpCtx.save();
      pvpCtx.translate(lx, ly);
      pvpCtx.rotate(midAngle + Math.PI / 2);
      pvpCtx.fillStyle = '#fff';
      pvpCtx.font = `bold ${Math.max(8, Math.min(11, Math.floor(slice * 14)))}px -apple-system`;
      pvpCtx.textAlign = 'center';
      pvpCtx.textBaseline = 'middle';
      const label = p.username ? '@' + p.username : p.firstName;
      pvpCtx.fillText(label.length > 8 ? label.slice(0, 7) + '…' : label, 0, 0);
      pvpCtx.restore();
    }

    startAngle = endAngle;
  });

  // Center circle
  pvpCtx.beginPath();
  pvpCtx.arc(cx, cy, 22, 0, Math.PI * 2);
  pvpCtx.fillStyle = '#0a0a0a';
  pvpCtx.fill();
  pvpCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  pvpCtx.lineWidth = 2;
  pvpCtx.stroke();

  // Center icon ⚔️
  pvpCtx.font = '16px serif';
  pvpCtx.textAlign = 'center';
  pvpCtx.textBaseline = 'middle';
  pvpCtx.fillText('⚔️', cx, cy);

  // Pointer (top triangle)
  pvpCtx.beginPath();
  pvpCtx.moveTo(cx - 10, 0);
  pvpCtx.lineTo(cx + 10, 0);
  pvpCtx.lineTo(cx, 22);
  pvpCtx.closePath();
  pvpCtx.fillStyle = '#ffffff';
  pvpCtx.fill();
  pvpCtx.shadowColor = 'rgba(255,255,255,0.6)';
  pvpCtx.shadowBlur = 8;
  pvpCtx.fill();
  pvpCtx.shadowBlur = 0;
}

function calcTargetAngle(game) {
  if (!game.winner) return 0;
  const total = game.totalBet;
  let acc = 0;
  for (const p of game.players) {
    const slice = (p.bet / total) * Math.PI * 2;
    if (p.uid === game.winner.uid) {
      // mid of winner sector should land at top (angle 0 after -PI/2 offset)
      const mid = acc + slice / 2;
      return -mid;
    }
    acc += slice;
  }
  return 0;
}

function animateSpin(game) {
  const targetOffset = calcTargetAngle(game);
  const totalSpins = Math.PI * 2 * 6; // 6 полных оборотов
  const target = totalSpins + targetOffset;
  const duration = 4500;
  const startTime = performance.now();
  pvpCurrentRotation = 0;

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    pvpCurrentRotation = eased * target;

    drawWheel(game, pvpCurrentRotation);

    if (progress < 1) {
      pvpAnimFrame = requestAnimationFrame(frame);
    } else {
      pvpSpinning = false;
      // Ждём финального состояния от сервера
    }
  }
  pvpAnimFrame = requestAnimationFrame(frame);
}

function showPvpResult(game) {
  const el = document.getElementById('pvp-result');
  if (!el || !game.winner) return;
  const w = game.winner;
  const isMe = w.uid === UID;
  const winnerColor = PVP_COLORS[game.players.findIndex(p => p.uid === w.uid) % 10];

  if (isMe) { S.balance += game.totalBet; syncB(); }

  document.getElementById('pvp-res-ico').textContent = isMe ? '🏆' : '😔';
  document.getElementById('pvp-res-title').textContent = isMe ? 'Вы победили!' : 'Победил другой';
  document.getElementById('pvp-res-name').innerHTML = `<span style="color:${winnerColor};font-weight:800">${w.username ? '@' + w.username : w.firstName}</span> выиграл ${game.totalBet.toLocaleString('ru')} 🪙`;
  document.getElementById('pvp-res-prize').textContent = isMe ? `+${game.totalBet.toLocaleString('ru')} монет!` : '';
  document.getElementById('pvp-res-prize').style.color = isMe ? 'var(--green)' : 'var(--muted2)';
}

/* ══ PAGE ENTER ══ */
function onPvpPageEnter() {
  startPvpPolling();
  fetchPvpState();
}
function onPvpPageLeave() {
  // Polling продолжается чтобы не пропустить результат
}
