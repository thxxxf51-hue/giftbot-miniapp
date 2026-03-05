/* ══ PvP ══ */
const PVP_COLORS = ['#3df2a0','#e74c3c','#5b8def','#f39c12','#9b59b6','#1cd1a1','#e67e22','#ff6fb7','#00e5ff','#f4c430'];
const PVP_MIN_BET = 50;

/* ─── STATE ─── */
let _pvpGame       = null;   // current server game
let _pvpPollTimer  = null;
let _pvpRafId      = null;
let _pvpCdTimer    = null;
let _pvpResTimer   = null;

// Per-game tracking — keyed by game.id
let _pvpSpunFor    = null;   // game.id we started spin for
let _pvpResultFor  = null;   // game.id we showed result for
let _pvpHistoryFor = null;   // game.id we added to history

let _pvpCanvas     = null;
let _pvpCtx        = null;
let _pvpAvatars    = {};     // uid -> Image|null
let _pvpHistory    = [];     // loaded from server

const $ = id => document.getElementById(id);

/* ─── BLOCKS ─── */
// All blocks in the pvp page
const PVP_BLOCKS = ['pvp-idle-block','pvp-lobby-block','pvp-ingame-block','pvp-result-block'];
function pvpShow(id) {
  PVP_BLOCKS.forEach(b => {
    const el = $(b);
    if (!el) return;
    if (b === id) { el.style.display = b === 'pvp-result-block' ? 'flex' : 'block'; }
    else el.style.display = 'none';
  });
}

/* ─── POLLING ─── */
function startPvpPolling() {
  if (_pvpPollTimer) return;
  _fetchPvp();
  _pvpPollTimer = setInterval(_fetchPvp, 2500);
}

async function _fetchPvp() {
  try {
    const r = await fetch('/api/pvp/state');
    const d = await r.json();
    if (!d.ok) return;
    _pvpGame = d.game;
    if (_pvpGame?.players) _preloadAvatars(_pvpGame.players);
    _pvpRender();
  } catch {}
}

async function _fetchHistory() {
  try {
    const r = await fetch('/api/pvp/history');
    const d = await r.json();
    if (d.ok) {
      _pvpHistory = d.history || [];
      _renderHistoryModal();
      // Update count badge
      const cnt = $('pvp-hist-count');
      if (cnt) cnt.textContent = _pvpHistory.length ? _pvpHistory.length + ' игр' : '';
    }
  } catch {}
}

/* ─── AVATAR PRELOAD ─── */
function _preloadAvatars(players) {
  players.forEach(p => {
    if (_pvpAvatars[p.uid] !== undefined) return;
    _pvpAvatars[p.uid] = null; // loading sentinel
    if (!p.photoUrl) return;
    const img = new Image();
    // Проксируем через наш сервер чтобы обойти CORS Telegram CDN
    img.onload  = () => { _pvpAvatars[p.uid] = img; };
    img.onerror = () => { _pvpAvatars[p.uid] = null; };
    img.src = '/api/avatar?url=' + encodeURIComponent(p.photoUrl);
  });
}

/* ─── MASTER RENDER ─── */
function _pvpRender() {
  if (curPage !== 'pvp') return;
  const g = _pvpGame;

  /* NO GAME */
  if (!g) {
    _stopAnimations();
    pvpShow('pvp-idle-block');
    _renderHistoryInto('pvp-idle-history');
    return;
  }

  /* WAITING / FILLING — lobby */
  if (g.state === 'waiting' || g.state === 'filling') {
    _stopAnimations();
    pvpShow('pvp-lobby-block');
    _renderLobby(g);
    _renderHistoryInto('pvp-lobby-history');
    return;
  }

  /* COUNTDOWN — wheel static + countdown */
  if (g.state === 'countdown') {
    pvpShow('pvp-ingame-block');
    _renderIngamePlayers(g);
    _initCanvas();
    _startCountdownDraw(g);
    return;
  }

  /* SPINNING — animate once */
  if (g.state === 'spinning') {
    pvpShow('pvp-ingame-block');
    _renderIngamePlayers(g);
    _initCanvas();
    if (_pvpSpunFor !== g.id) {
      _pvpSpunFor = g.id;
      _startSpin(g, () => {
        // spin finished — show result
        if (_pvpResultFor !== g.id) {
          _pvpResultFor = g.id;
          pvpShow('pvp-result-block');
          _showResult(g);
        }
      });
    }
    return;
  }

  /* DONE — server says done */
  if (g.state === 'done') {
    // Already handled this game fully — ignore all future polls
    if (_pvpResultFor === g.id) return;

    // User refreshed/joined while game was in 'done' state on server
    // Don't replay spin — just mark as handled and go to idle immediately
    _pvpResultFor  = g.id;
    _pvpSpunFor    = g.id;
    _pvpHistoryFor = g.id;
    _pvpGame = null;
    pvpShow('pvp-idle-block');
    _fetchHistory();
    return;
  }
}

function _stopAnimations() {
  cancelAnimationFrame(_pvpRafId);
  clearTimeout(_pvpCdTimer);
  _pvpRafId = null;
}

/* ─── LOBBY ─── */
function _renderLobby(g) {
  const stEl = $('pvp-state-label');
  const tiEl = $('pvp-timer');
  const cnEl = $('pvp-count');
  const totEl= $('pvp-total');
  const lst  = $('pvp-players-list');
  const jSec = $('pvp-lobby-join-section');
  const lBtn = $('pvp-leave-btn');

  if (cnEl)  cnEl.textContent  = g.players.length + ' / 10';
  if (totEl) totEl.textContent = g.totalBet.toLocaleString('ru') + ' 🪙';

  clearTimeout(_pvpCdTimer);
  const tick = () => {
    if (!_pvpGame || (_pvpGame.state !== 'filling' && _pvpGame.state !== 'waiting')) return;
    if (_pvpGame.state === 'waiting') {
      if (stEl) stEl.textContent = '⏳ Ожидание игроков';
      if (tiEl) tiEl.textContent = '';
    } else {
      if (stEl) stEl.textContent = '🔥 Набор идёт!';
      const left = Math.max(0, Math.ceil((_pvpGame.fillEndsAt - Date.now()) / 1000));
      if (tiEl) tiEl.textContent = left + 'с';
      if (left > 0) _pvpCdTimer = setTimeout(tick, 300);
    }
  };
  tick();

  if (lst) lst.innerHTML = g.players.map((p, i) => {
    const pct = ((p.bet / g.totalBet) * 100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div class="pvp-player-row">
      <div class="pvp-player-dot" style="background:${PVP_COLORS[i%10]}"></div>
      <div class="pvp-player-info">
        <div class="pvp-player-name">${isMe ? '👤 Вы' : (p.username ? '@'+p.username : p.firstName)}</div>
        <div class="pvp-player-bar-wrap"><div class="pvp-player-bar" style="width:${pct}%;background:${PVP_COLORS[i%10]}"></div></div>
      </div>
      <div class="pvp-player-right">
        <div class="pvp-player-bet">${p.bet.toLocaleString('ru')} 🪙</div>
        <div class="pvp-player-pct">${pct}%</div>
      </div>
    </div>`;
  }).join('');

  const amIn = g.players.find(p => p.uid === UID);
  if (jSec) jSec.style.display = amIn ? 'none' : 'flex';
  if (lBtn) lBtn.style.display = amIn ? 'block' : 'none';
}

/* ─── INGAME PLAYERS ─── */
function _renderIngamePlayers(g) {
  const el  = $('pvp-ingame-players');
  const tot = $('pvp-ingame-total');
  if (!el) return;
  if (tot) tot.textContent = 'Банк: ' + g.totalBet.toLocaleString('ru') + ' 🪙';
  el.innerHTML = g.players.map((p, i) => {
    const pct = ((p.bet / g.totalBet) * 100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <div style="width:8px;height:8px;border-radius:50%;background:${PVP_COLORS[i%10]};flex-shrink:0"></div>
      <div style="font-size:12px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isMe ? '👤 Вы' : (p.username ? '@'+p.username : p.firstName)}</div>
      <div style="font-size:11px;color:var(--muted2)">${p.bet.toLocaleString('ru')} 🪙</div>
      <div style="font-size:11px;font-weight:700;color:${PVP_COLORS[i%10]};min-width:38px;text-align:right">${pct}%</div>
    </div>`;
  }).join('');
}

/* ─── CANVAS ─── */
function _initCanvas() {
  if (!_pvpCanvas) {
    _pvpCanvas = $('pvp-canvas');
    _pvpCtx    = _pvpCanvas.getContext('2d');
  }
  const wrap = $('pvp-ingame-block');
  const size = Math.min(wrap ? wrap.clientWidth - 20 : 280, 300);
  if (_pvpCanvas._sz === size) return;
  const dpr = window.devicePixelRatio || 1;
  _pvpCanvas.width        = size * dpr;
  _pvpCanvas.height       = size * dpr;
  _pvpCanvas.style.width  = size + 'px';
  _pvpCanvas.style.height = size + 'px';
  _pvpCtx.setTransform(1, 0, 0, 1, 0, 0);
  _pvpCtx.scale(dpr, dpr);
  _pvpCanvas._sz = size;
}

function _drawWheel(g, rot, secLeft) {
  if (!_pvpCtx || !_pvpCanvas) return;
  const sz = _pvpCanvas._sz || 280;
  const cx = sz/2, cy = sz/2;
  const outerR = cx - 5;
  const innerR = sz * 0.20;
  const avR    = sz * 0.080;
  const players= g.players;
  const total  = g.totalBet;

  _pvpCtx.clearRect(0, 0, sz, sz);

  // Base
  _pvpCtx.beginPath();
  _pvpCtx.arc(cx, cy, outerR, 0, Math.PI*2);
  _pvpCtx.fillStyle = '#111';
  _pvpCtx.fill();

  // Sectors + avatar positions
  let a = rot - Math.PI/2;
  const avPos = [];
  players.forEach((p, i) => {
    const slice = (p.bet / total) * Math.PI * 2;
    const end   = a + slice;
    const col   = PVP_COLORS[i % 10];

    _pvpCtx.beginPath();
    _pvpCtx.moveTo(cx, cy);
    _pvpCtx.arc(cx, cy, outerR, a, end);
    _pvpCtx.closePath();
    _pvpCtx.fillStyle = col;
    _pvpCtx.fill();

    // Divider
    _pvpCtx.beginPath();
    _pvpCtx.moveTo(cx, cy);
    _pvpCtx.lineTo(cx + Math.cos(a)*outerR, cy + Math.sin(a)*outerR);
    _pvpCtx.strokeStyle = 'rgba(0,0,0,0.55)';
    _pvpCtx.lineWidth   = 2.5;
    _pvpCtx.stroke();

    // Avatar at mid of sector
    const mid = a + slice/2;
    avPos.push({ x: cx + Math.cos(mid)*outerR*0.63, y: cy + Math.sin(mid)*outerR*0.63, uid: p.uid, col, label: (p.username || p.firstName || '?')[0].toUpperCase() });
    a = end;
  });

  // Center shadow
  _pvpCtx.beginPath();
  _pvpCtx.arc(cx, cy, innerR+4, 0, Math.PI*2);
  _pvpCtx.fillStyle = 'rgba(0,0,0,0.55)';
  _pvpCtx.fill();

  // Center circle
  _pvpCtx.beginPath();
  _pvpCtx.arc(cx, cy, innerR, 0, Math.PI*2);
  _pvpCtx.fillStyle = '#0c0c0c';
  _pvpCtx.fill();
  _pvpCtx.beginPath();
  _pvpCtx.arc(cx, cy, innerR, 0, Math.PI*2);
  _pvpCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  _pvpCtx.lineWidth = 1.5;
  _pvpCtx.stroke();

  // Center content — timer or icon
  _pvpCtx.save();
  _pvpCtx.textAlign = 'center';
  _pvpCtx.textBaseline = 'middle';
  if (secLeft !== undefined) {
    const mm = String(Math.floor(secLeft/60)).padStart(2,'0');
    const ss = String(secLeft%60).padStart(2,'0');
    _pvpCtx.fillStyle = '#fff';
    _pvpCtx.font = `bold ${Math.round(innerR*0.58)}px -apple-system,ui-monospace,monospace`;
    _pvpCtx.fillText(mm+':'+ss, cx, cy);
  } else {
    // sword lines
    _pvpCtx.strokeStyle = 'rgba(255,255,255,0.35)';
    _pvpCtx.lineWidth = 2;
    _pvpCtx.lineCap = 'round';
    const s = innerR * 0.45;
    _pvpCtx.beginPath(); _pvpCtx.moveTo(cx-s, cy-s); _pvpCtx.lineTo(cx+s, cy+s); _pvpCtx.stroke();
    _pvpCtx.beginPath(); _pvpCtx.moveTo(cx-s*.5, cy+s*.5); _pvpCtx.lineTo(cx+s*.5, cy-s*.5); _pvpCtx.stroke();
  }
  _pvpCtx.restore();

  // Avatars drawn on top of sectors
  avPos.forEach(av => _drawAvatar(av.x, av.y, avR, av.uid, av.col, av.label));

  // Pointer
  _pvpCtx.save();
  _pvpCtx.beginPath();
  _pvpCtx.moveTo(cx-11, 2);
  _pvpCtx.lineTo(cx+11, 2);
  _pvpCtx.lineTo(cx,    20);
  _pvpCtx.closePath();
  _pvpCtx.fillStyle = '#fff';
  _pvpCtx.shadowColor = 'rgba(255,255,255,0.75)';
  _pvpCtx.shadowBlur  = 10;
  _pvpCtx.fill();
  _pvpCtx.restore();
}

function _drawAvatar(x, y, r, uid, borderCol, fallbackLetter) {
  const img = _pvpAvatars[uid];
  _pvpCtx.save();

  // Coloured glow ring
  _pvpCtx.beginPath();
  _pvpCtx.arc(x, y, r+3.5, 0, Math.PI*2);
  _pvpCtx.fillStyle   = borderCol;
  _pvpCtx.shadowColor = borderCol;
  _pvpCtx.shadowBlur  = 8;
  _pvpCtx.fill();
  _pvpCtx.shadowBlur = 0;

  // White ring
  _pvpCtx.beginPath();
  _pvpCtx.arc(x, y, r+1.5, 0, Math.PI*2);
  _pvpCtx.fillStyle = '#fff';
  _pvpCtx.fill();

  // Clip to circle
  _pvpCtx.beginPath();
  _pvpCtx.arc(x, y, r, 0, Math.PI*2);
  _pvpCtx.clip();

  if (img) {
    _pvpCtx.drawImage(img, x-r, y-r, r*2, r*2);
  } else {
    // Fallback: colour + first letter
    _pvpCtx.fillStyle = borderCol;
    _pvpCtx.fillRect(x-r, y-r, r*2, r*2);
    _pvpCtx.fillStyle = 'rgba(0,0,0,0.3)';
    _pvpCtx.fillRect(x-r, y-r, r*2, r*2);
    _pvpCtx.fillStyle = '#fff';
    _pvpCtx.font = `bold ${Math.round(r * 0.95)}px -apple-system`;
    _pvpCtx.textAlign = 'center';
    _pvpCtx.textBaseline = 'middle';
    _pvpCtx.fillText(fallbackLetter || '?', x, y);
  }
  _pvpCtx.restore();
}

/* ─── COUNTDOWN DRAW ─── */
function _startCountdownDraw(g) {
  cancelAnimationFrame(_pvpRafId);
  const lbl = $('pvp-ingame-label');
  const frame = () => {
    if (!_pvpGame || _pvpGame.state !== 'countdown') return;
    const left = Math.max(0, Math.ceil((_pvpGame.countdownEndsAt - Date.now()) / 1000));
    if (lbl) lbl.textContent = '🚀 Игра начинается...';
    _drawWheel(g, 0, left);
    _pvpRafId = requestAnimationFrame(frame);
  };
  frame();
}

/* ─── SPIN ANIMATION ─── */
function _calcTarget(g) {
  if (!g.winner) return Math.PI * 2 * 7;
  const total = g.totalBet;
  let acc = 0;
  for (const p of g.players) {
    const slice = (p.bet / total) * Math.PI * 2;
    if (p.uid === g.winner.uid) return Math.PI * 2 * 7 + (-acc - slice / 2);
    acc += slice;
  }
  return Math.PI * 2 * 7;
}

function _startSpin(g, onDone) {
  cancelAnimationFrame(_pvpRafId);
  const target = _calcTarget(g);
  const dur    = 5200;
  const t0     = performance.now();
  const lbl    = $('pvp-ingame-label');
  if (lbl) lbl.textContent = 'Колесо крутится...';

  const frame = now => {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 5);
    const secLeft = Math.max(0, Math.ceil((dur - (now - t0)) / 1000));
    _drawWheel(g, e * target, secLeft);
    if (p < 1) {
      _pvpRafId = requestAnimationFrame(frame);
    } else {
      _drawWheel(g, e * target); // final frame, no timer
      if (onDone) onDone();
    }
  };
  _pvpRafId = requestAnimationFrame(frame);
}

/* ─── RESULT ─── */
function _showResult(g) {
  const w    = g.winner;
  if (!w) return;
  const isMe = w.uid === UID;
  const wIdx = g.players.findIndex(p => p.uid === w.uid);
  const wCol = PVP_COLORS[wIdx % 10] || '#fff';

  // Credit only once
  if (isMe) { S.balance += g.totalBet; syncB(); }

  $('pvp-res-ico').textContent   = isMe ? '🏆' : '😔';
  $('pvp-res-title').textContent  = isMe ? 'Вы победили!' : 'Победил другой';
  $('pvp-res-name').innerHTML    = `<span style="color:${wCol};font-weight:800">${w.username?'@'+w.username:w.firstName}</span> забирает ${g.totalBet.toLocaleString('ru')} 🪙`;
  const prEl = $('pvp-res-prize');
  prEl.textContent = isMe ? '+' + g.totalBet.toLocaleString('ru') + ' монет!' : '';
  prEl.style.color = isMe ? 'var(--green)' : 'var(--muted2)';

  // Refresh history from server after result (with delay so server has saved it)
  if (_pvpHistoryFor !== g.id) {
    _pvpHistoryFor = g.id;
    setTimeout(_fetchHistory, 6000);
  }

  // Countdown → back to idle
  let left = 5;
  clearTimeout(_pvpResTimer);
  const cdEl = $('pvp-res-countdown');
  const tick = () => {
    if (cdEl) cdEl.textContent = 'Возврат через ' + left + 'с…';
    if (left <= 0) {
      // Mark game as fully handled — future polls with same id will be ignored
      _pvpGame = null;
      pvpShow('pvp-idle-block');
      _renderHistoryInto('pvp-idle-history');
      return;
    }
    left--;
    _pvpResTimer = setTimeout(tick, 1000);
  };
  tick();
}

/* ─── HISTORY ─── */
function _historyHTML(list) {
  if (!list.length) return '<div style="padding:20px;text-align:center;color:var(--muted2);font-size:13px">Нет игр за последний час</div>';
  return list.map(h => {
    const d   = new Date(h.time);
    const hh  = String(d.getHours()).padStart(2,'0');
    const mm  = String(d.getMinutes()).padStart(2,'0');
    const ago = Math.floor((Date.now()-h.time)/60000);
    const agoStr = ago < 1 ? 'только что' : ago+'м назад';
    const col = h.winnerColor || 'var(--green)';
    return `<div class="gc" style="padding:11px 14px;margin-bottom:7px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:var(--muted2);margin-bottom:3px">${hh}:${mm} · ${h.players} игр. · ${agoStr}</div>
          <div style="font-size:13px;font-weight:700">🏆 <span style="color:${col}">${h.winnerName||h.winner||'?'}</span></div>
        </div>
        <div style="font-size:14px;font-weight:800;color:var(--green)">${(h.totalBet||0).toLocaleString('ru')} 🪙</div>
      </div>
    </div>`;
  }).join('');
}

function _renderHistoryInto(containerId) {
  const wrap = $(containerId);
  if (!wrap) return;
  wrap.innerHTML = _historyHTML(_pvpHistory);
}

function _renderHistoryModal() {
  const list = $('pvp-hist-modal-list');
  if (list) list.innerHTML = _historyHTML(_pvpHistory);
}

function openPvpHistory() {
  _fetchHistory();
  const mo = $('pvp-hist-mo');
  if (!mo) return;
  mo.style.display = 'flex';
  requestAnimationFrame(() => mo.classList.add('show'));
}

function closePvpHistory() {
  const mo = $('pvp-hist-mo');
  if (!mo) return;
  mo.classList.remove('show');
  setTimeout(() => { mo.style.display = 'none'; }, 250);
}

/* ─── JOIN / LEAVE ─── */
async function _pvpJoinWith(inputId, btnId) {
  const input = $(inputId);
  const bet   = parseInt(input?.value || 0);
  if (!bet || bet < PVP_MIN_BET) { toast('Минимум ' + PVP_MIN_BET + ' монет', 'r'); return; }
  if (bet > S.balance) { toast('Недостаточно монет', 'r'); return; }
  const btn = $(btnId); if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const r = await fetch('/api/pvp/join', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId: UID, username: TGU.username||'', firstName: TGU.first_name||'User', photoUrl: TGU.photo_url||'', bet })
    });
    const d = await r.json();
    if (d.ok) { S.balance -= bet; syncB(); if (input) input.value = ''; await _fetchPvp(); toast('✅ Вы в игре!', 'g'); }
    else toast(d.error || 'Ошибка', 'r');
  } catch { toast('Ошибка', 'r'); }
  if (btn) { btn.disabled = false; btn.textContent = '⚔️ Участвовать'; }
}

function pvpJoin()  { _pvpJoinWith('pvp-bet-input',  'pvp-join-btn'); }
function pvpJoin2() { _pvpJoinWith('pvp-bet-input2', 'pvp-join-btn2'); }

async function pvpLeave() {
  const btn = $('pvp-leave-btn'); if (btn) btn.disabled = true;
  try {
    const r = await fetch('/api/pvp/leave', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId: UID })
    });
    const d = await r.json();
    if (d.ok) { S.balance += d.refunded; syncB(); toast('↩️ Монеты возвращены', 'g'); await _fetchPvp(); }
    else toast(d.error || 'Ошибка', 'r');
  } catch { toast('Ошибка', 'r'); }
  if (btn) btn.disabled = false;
}

/* ─── PAGE HOOKS ─── */
function onPvpPageEnter() { startPvpPolling(); _pvpRender(); _fetchHistory(); }
function onPvpPageLeave() {}

/* ── MODE SWITCH ── */
function pvpSwitchMode(btn, mode) {
  document.querySelectorAll(".stab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const duel = document.getElementById("pvp-duel-wrap");
  const solo = document.getElementById("pvp-solo-wrap");
  if (mode === "solo") {
    if (duel) duel.style.display = "none";
    if (solo) { solo.style.display = "block"; initSoloPage(); }
  } else {
    if (solo) solo.style.display = "none";
    if (duel) duel.style.display = "block";
  }
}

