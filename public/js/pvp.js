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
    if (b === id) { el.style.display = 'block'; }
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
  // ping server that user is in duel mode
  try { const uid=window.S?.uid||window.tgUserId||''; if(uid) fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:uid,mode:'duel'})}).catch(()=>{}); } catch{}
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
  if (totEl) totEl.innerHTML = g.totalBet.toLocaleString('ru') + ' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>';

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
        <div class="pvp-player-bet">${p.bet.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg></div>
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
  if (tot) tot.innerHTML = 'Банк: ' + g.totalBet.toLocaleString('ru') + ' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>';
  el.innerHTML = g.players.map((p, i) => {
    const pct = ((p.bet / g.totalBet) * 100).toFixed(1);
    const isMe = p.uid === UID;
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <div style="width:8px;height:8px;border-radius:50%;background:${PVP_COLORS[i%10]};flex-shrink:0"></div>
      <div style="font-size:12px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isMe ? '👤 Вы' : (p.username ? '@'+p.username : p.firstName)}</div>
      <div style="font-size:11px;color:var(--muted2)">${p.bet.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg></div>
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
  const w = g.winner;
  if (!w) return;
  const isMe = w.uid === UID;
  const wIdx = g.players.findIndex(p => p.uid === w.uid);
  const wCol = PVP_COLORS[wIdx % 10] || '#fff';

  // Credit winner from server (авторитетный источник баланса)
  if (isMe) {
    fetch('/api/pvp/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: UID })
    }).then(r => r.json()).then(d => {
      if (d.ok && d.balance !== undefined) {
        S.balance = d.balance;
        syncB();
        // Чистая прибыль = выигрыш - своя ставка
        const _myPlayer = g.players.find(p => p.uid === String(UID));
        const _net = (d.prize || 0) - (_myPlayer ? _myPlayer.bet : 0);
        if(_net>0)fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:_net})}).catch(()=>{});
      }
    }).catch(() => {
      S.balance += g.totalBet;
      syncB();
    });
  }

  // Chance = winner's bet / total bank
  const wPlayer = g.players.find(p => p.uid === w.uid);
  const chancePct = wPlayer && g.totalBet > 0
    ? Math.round((wPlayer.bet / g.totalBet) * 1000) / 10
    : 0;

  // Fill bottom sheet
  const gameid = $('pvp-res-gameid');
  if (gameid) gameid.textContent = 'Игра #' + g.id;

  // Avatar
  const avEl = $('pvp-res-av');
  if (avEl) {
    if (w.photoUrl) {
      avEl.innerHTML = `<img src="${w.photoUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='${(w.firstName||'?')[0].toUpperCase()}'">`;
    } else {
      avEl.textContent = (w.firstName || '?')[0].toUpperCase();
      avEl.style.background = wCol + '33';
      avEl.style.color = wCol;
    }
  }

  const nm = $('pvp-res-name2');
  if (nm) { nm.textContent = w.firstName || 'Игрок'; nm.style.color = wCol; }

  const un = $('pvp-res-un');
  if (un) un.textContent = w.username ? '@' + w.username : '';

  const won = $('pvp-res-won');
  if (won) { won.innerHTML = 'Выиграл ' + g.totalBet.toLocaleString('ru') + ' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>'; won.style.color = isMe ? 'var(--green)' : wCol; }

  const ch = $('pvp-res-chance');
  if (ch) ch.textContent = 'Шанс ' + chancePct + '%';

  const bank = $('pvp-res-bank');
  if (bank) bank.innerHTML = g.totalBet.toLocaleString('ru') + ' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>';

  const pl = $('pvp-res-players');
  if (pl) pl.textContent = g.players.length + ' ' + (g.players.length === 1 ? 'участник' : g.players.length < 5 ? 'участника' : 'участников');

  const badge = $('pvp-res-mybadge');
  if (badge) {
    if (isMe) {
      badge.style.display = 'block';
      badge.style.background = 'rgba(46,204,113,.12)';
      badge.style.border = '1px solid rgba(46,204,113,.3)';
      badge.style.color = 'var(--green)';
      badge.innerHTML = '🏆 Вы победили! +' + g.totalBet.toLocaleString('ru') + ' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>';
    } else {
      badge.style.display = 'block';
      badge.style.background = 'rgba(255,255,255,.04)';
      badge.style.border = '1px solid rgba(255,255,255,.08)';
      badge.style.color = 'rgba(255,255,255,.4)';
      badge.textContent = '😔 Победил другой игрок';
    }
  }

  // Open bottom sheet
  pvpOpenResSheet();

  // Refresh history from server after result
  if (_pvpHistoryFor !== g.id) {
    _pvpHistoryFor = g.id;
    setTimeout(_fetchHistory, 6000);
  }

  // Countdown → back to idle
  let left = 7;
  clearTimeout(_pvpResTimer);
  const cdEl = $('pvp-res-countdown');
  const tick = () => {
    if (cdEl) cdEl.textContent = 'Закроется через ' + left + 'с…';
    if (left <= 0) {
      pvpCloseResSheet();
      setTimeout(() => {
        _pvpGame = null;
        pvpShow('pvp-idle-block');
        _renderHistoryInto('pvp-idle-history');
      }, 450);
      return;
    }
    left--;
    _pvpResTimer = setTimeout(tick, 1000);
  };
  tick();
}

function pvpOpenResSheet() {
  const sheet = $('pvp-res-sheet');
  const box   = $('pvp-res-sheet-box');
  if (!sheet || !box) return;
  sheet.style.pointerEvents = 'all';
  sheet.style.background    = 'rgba(0,0,0,0.6)';
  box.style.transform       = 'translateY(0)';
}

function pvpCloseResSheet() {
  const sheet = $('pvp-res-sheet');
  const box   = $('pvp-res-sheet-box');
  if (!sheet || !box) return;
  sheet.style.pointerEvents = 'none';
  sheet.style.background    = 'rgba(0,0,0,0)';
  box.style.transform       = 'translateY(100%)';
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
function onPvpPageEnter() {
  // Always show menu cards first when entering PvP page
  const menu = $('pvp-menu-block');
  const duel = $('pvp-duel-wrap');
  const solo = $('pvp-solo-wrap');
  const mines = $('pvp-mines-wrap');
  if (menu) menu.style.display = 'block';
  if (duel) duel.style.display = 'none';
  if (solo) solo.style.display = 'none';
  if (mines) mines.style.display = 'none';
  startPvpPolling(); _pvpRender(); _fetchHistory();
}
function onPvpPageLeave() {
  // Stop online timer when leaving page
  if (window._pvpOnlineTimer) { clearInterval(window._pvpOnlineTimer); window._pvpOnlineTimer = null; }
  // Hide all game wraps so on next enter the menu is clean
  const duel  = $('pvp-duel-wrap');
  const solo  = $('pvp-solo-wrap');
  const mines = $('pvp-mines-wrap');
  const bw    = document.getElementById('pvp-bets-wrap');
  const menu  = $('pvp-menu-block');
  if (duel)  duel.style.display  = 'none';
  if (solo)  solo.style.display  = 'none';
  if (mines) mines.style.display = 'none';
  if (bw)    bw.style.display    = 'none';
  if (menu)  menu.style.display  = 'block';
}

/* ── MODE SWITCH ── */
function pvpSwitchMode(btn, mode) {
  // legacy tab support — redirect to menu select
  pvpMenuSelect(mode);
}

function pvpMenuSelect(mode) {
  if (mode === 'bets') {
    const menu = $('pvp-menu-block');
    const duel = $('pvp-duel-wrap');
    const solo = $('pvp-solo-wrap');
    const mines = $('pvp-mines-wrap');
    const card = document.getElementById('pvp-menu-bets');
    if (menu)  menu.style.display  = 'none';
    if (duel)  duel.style.display  = 'none';
    if (solo)  solo.style.display  = 'none';
    if (mines) mines.style.display = 'none';
    if (card)  card.style.display  = 'none';
    const bw = document.getElementById('pvp-bets-wrap');
    if (bw) bw.style.display = 'block';
    const pill = document.getElementById('bets-bal-pill');
    if (pill && window.S) pill.textContent = (window.S.balance||0).toLocaleString('ru');
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(e){}
    onBetsPageEnter();
    return;
  }
  const menu = $('pvp-menu-block');
  const duel = $('pvp-duel-wrap');
  const solo = $('pvp-solo-wrap');
  const mines = $('pvp-mines-wrap');
  // haptic
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch{}
  if (mode === 'solo') {
    if (menu) menu.style.display = 'none';
    if (duel) duel.style.display = 'none';
    if (mines) mines.style.display = 'none';
    if (solo) { solo.style.display = 'block'; initSoloPage(); }
  } else if (mode === 'mines') {
    if (menu) menu.style.display = 'none';
    if (duel) duel.style.display = 'none';
    if (solo) solo.style.display = 'none';
    if (mines) { mines.style.display = 'block'; if (typeof initMinesPage === 'function') initMinesPage(); }
  } else {
    if (menu) menu.style.display = 'none';
    if (solo) solo.style.display = 'none';
    if (mines) mines.style.display = 'none';
    if (duel) duel.style.display = 'block';
  }
}

function pvpBackToMenu() {
  const bw = document.getElementById('pvp-bets-wrap');
  if (bw) { bw.style.display = 'none'; onBetsPageLeave(); }
  const menu  = $('pvp-menu-block');
  const duel  = $('pvp-duel-wrap');
  const solo  = $('pvp-solo-wrap');
  const mines = $('pvp-mines-wrap');
  const card  = document.getElementById('pvp-menu-bets');
  if (duel)  duel.style.display  = 'none';
  if (solo)  solo.style.display  = 'none';
  if (mines) mines.style.display = 'none';
  if (card)  card.style.display  = '';
  if (menu)  menu.style.display  = 'block';
}



/* ══ PvP MENU: wheel + lightning + online ══ */
(function(){
  /* ── Swords illustration (canvas, pixel-perfect) ── */
  function drawMenuSwords(){
    const cv = document.getElementById('pvp-swords-cv');
    if(!cv) return;
    const ctx = cv.getContext('2d');
    const W=340, H=296;
    ctx.clearRect(0,0,W,H);

    function drawSword(tipX,tipY,angle,color1,color2,guardColor,glowColor){
      ctx.save();
      ctx.translate(tipX,tipY);
      ctx.rotate(angle);

      // blade glow
      ctx.shadowColor=glowColor; ctx.shadowBlur=22;
      const bg=ctx.createLinearGradient(0,0,0,192);
      bg.addColorStop(0,'#ffffff'); bg.addColorStop(0.4,color1); bg.addColorStop(1,color2);
      ctx.beginPath();
      ctx.roundRect(-4,0,8,192,4);
      ctx.fillStyle=bg; ctx.fill();

      // guard
      ctx.shadowBlur=14;
      const gg=ctx.createLinearGradient(-22,30,22,30);
      gg.addColorStop(0,guardColor); gg.addColorStop(1,'#fff');
      ctx.beginPath(); ctx.roundRect(-22,28,44,9,4);
      ctx.fillStyle=gg; ctx.fill();

      // pommel
      ctx.beginPath(); ctx.roundRect(-7,185,14,16,5);
      ctx.fillStyle=color2; ctx.fill();

      ctx.restore();
    }

    // Sword 1 (blue) - left, pointing top-right
    drawSword(140,22,-0.52,'#7aaeff','#3a6bdf','#5b8def','rgba(91,141,239,0.8)');
    // Sword 2 (red) - right, pointing top-left
    drawSword(200,28,0.52,'#ff8c5a','#e74c3c','#e74c3c','rgba(231,76,60,0.8)');

    // Stars
    ctx.shadowBlur=0;
    [[76,42,3],[56,132,2],[108,190,3],[56,56,2],[320,36,2],[300,180,3]].forEach(([x,y,r])=>{
      ctx.globalAlpha=0.6;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
  }
  function drawMenuWheel(){
    const cv = document.getElementById('pvp-solo-wheel-cv');
    if(!cv) return;
    const ctx = cv.getContext('2d');
    const S=224, cx=S/2, cy=S/2, R=S/2-4, inner=R*0.36;
    const sectors=[
      {a:.30,c1:'#2ecc71',c2:'#1a9e52'},
      {a:.20,c1:'#5b8def',c2:'#1f6fa3'},
      {a:.18,c1:'#9b59b6',c2:'#6c3483'},
      {a:.14,c1:'#e74c3c',c2:'#a93226'},
      {a:.18,c1:'#1a1a28',c2:'#111118'},
    ];
    let start=-Math.PI/2;
    sectors.forEach(s=>{
      const sweep=s.a*Math.PI*2, end=start+sweep, mid=start+sweep/2;
      const g=ctx.createLinearGradient(cx+Math.cos(start)*R*.5,cy+Math.sin(start)*R*.5,cx+Math.cos(end)*R*.5,cy+Math.sin(end)*R*.5);
      g.addColorStop(0,s.c1);g.addColorStop(1,s.c2);
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,start,end);ctx.closePath();ctx.fillStyle=g;ctx.fill();
      if(s.c1!=='#1a1a28'){
        const sg=ctx.createRadialGradient(cx+Math.cos(mid)*R*.45,cy+Math.sin(mid)*R*.45,0,cx+Math.cos(mid)*R*.45,cy+Math.sin(mid)*R*.45,R*.5);
        sg.addColorStop(0,'rgba(255,255,255,.17)');sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,start,end);ctx.closePath();ctx.fillStyle=sg;ctx.fill();
      }
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(end)*R,cy+Math.sin(end)*R);
      ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=2;ctx.stroke();
      start=end;
    });
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=2.5;ctx.stroke();
    const ig=ctx.createRadialGradient(cx,cy,0,cx,cy,inner);
    ig.addColorStop(0,'#0e0e16');ig.addColorStop(1,'#12121a');
    ctx.beginPath();ctx.arc(cx,cy,inner,0,Math.PI*2);ctx.fillStyle=ig;ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.38)';ctx.font='600 13px -apple-system,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SPIN',cx,cy);
  }

  /* ── Lightning ── */
  function initLightning(){
    const cv = document.getElementById('pvp-lightning-cv');
    if(!cv) return;
    const ctx=cv.getContext('2d');
    const W=cv.width, H=cv.height;
    // Swords cross at approx center-right of card
    // Canvas is full card width (340px), swords are on right half (170-340px)
    // Sword tips: blue~(310,22), red~(370,28) scaled to canvas coords
    // Cross point approx x=255, y=60 on the 340px canvas
    const DIRS=[
      {x0:200, y0:4,   x1:310, y1:142, cx:252, cy:62},  // top-left → bottom-right
      {x0:310, y0:4,   x1:200, y1:142, cx:252, cy:62},  // top-right → bottom-left
    ];
    function rand(a,b){return a+Math.random()*(b-a);}
    function makeBolt(sx,sy,ex,ey,segs,spread){
      const pts=[{x:sx,y:sy}];
      for(let i=1;i<segs;i++){
        const t=i/segs,mx=sx+(ex-sx)*t,my=sy+(ey-sy)*t;
        const dx=-(ey-sy),dy=ex-sx,len=Math.sqrt(dx*dx+dy*dy)||1;
        pts.push({x:mx+(dx/len)*rand(-spread,spread),y:my+(dy/len)*rand(-spread,spread)});
      }
      pts.push({x:ex,y:ey});return pts;
    }
    function ds(pts,alpha,width,color,blur){
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
      ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=blur;
      ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      ctx.stroke();ctx.restore();
    }
    let frame=0,bolt=null,running=false,fcx=252,fcy=62;
    function flash(){
      if(running)return;
      running=true;
      const d=DIRS[Math.random()<0.5?0:1];
      bolt=makeBolt(d.x0,d.y0,d.x1,d.y1,14,9);
      fcx=d.cx;fcy=d.cy;frame=0;tick();
    }
    function tick(){
      ctx.clearRect(0,0,W,H);frame++;
      const DRAW=10,HOLD=4,FADE=14,total=DRAW+HOLD+FADE;
      let vpts,a;
      if(frame<=DRAW){const p=frame/DRAW;vpts=bolt.slice(0,Math.max(2,Math.round(bolt.length*p)));a=1;}
      else if(frame<=DRAW+HOLD){vpts=bolt;a=1;}
      else{vpts=bolt;a=1-(frame-DRAW-HOLD)/FADE;}
      if(vpts&&vpts.length>1){
        ds(vpts,a*.28,14,'#3a6bdf',22);ds(vpts,a*.55,6,'#7aaeff',14);
        ds(vpts,a*.85,2.5,'#c8e4ff',7);ds(vpts,a,1.2,'#ffffff',3);
        if(frame>=DRAW&&frame<=DRAW+HOLD+3){
          ctx.save();ctx.globalAlpha=a*.8;
          const rg=ctx.createRadialGradient(fcx,fcy,0,fcx,fcy,18);
          rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(0.3,'rgba(180,220,255,.6)');rg.addColorStop(1,'rgba(91,141,239,0)');
          ctx.fillStyle=rg;ctx.beginPath();ctx.arc(fcx,fcy,18,0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
      if(frame<total)requestAnimationFrame(tick);
      else{ctx.clearRect(0,0,W,H);running=false;}
    }
    setTimeout(flash,400);
    setInterval(flash,2000);
  }

  /* ── Card ripple + haptic ── */
  function initCardPress(){
    [['pvp-menu-duel','rgba(91,141,239,0.35)'],['pvp-menu-solo','rgba(46,204,113,0.35)'],['pvp-menu-mines','rgba(231,90,40,0.35)']].forEach(([id,accent])=>{
      const card=document.getElementById(id);
      if(!card)return;
      card.addEventListener('pointerdown',function(e){
        try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');}catch{}
        card.style.transform='scale(0.96)';
        card.style.boxShadow='0 0 0 1px '+accent+', inset 0 2px 16px rgba(0,0,0,.5)';
        card.style.borderColor=accent;
        const rect=card.getBoundingClientRect();
        const x=e.clientX-rect.left, y=e.clientY-rect.top;
        const rpl=document.createElement('span');
        const sz=Math.max(rect.width,rect.height)*1.8;
        rpl.style.cssText=`position:absolute;left:${x-sz/2}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,.07);transform:scale(0);pointer-events:none;z-index:10;animation:ripple-card .55s cubic-bezier(.4,0,.2,1) forwards;`;
        card.appendChild(rpl);
        rpl.addEventListener('animationend',()=>rpl.remove());
      });
      card.addEventListener('pointerup',()=>{card.style.transform='';card.style.boxShadow='';card.style.borderColor='';});
      card.addEventListener('pointerleave',()=>{card.style.transform='';card.style.boxShadow='';card.style.borderColor='';});
    });
  }

  /* ── Real online counter ── */
  function pingActivity(mode){
    const uid = window.S?.uid || window.tgUserId || '';
    if(!uid) return;
    fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:uid,mode})}).catch(()=>{});
  }

  function updateMenuOnline(){
    pingActivity('menu');
    fetch('/api/pvp-online').then(r=>r.json()).then(d=>{
      // Never touch b-pvp — that's the balance pill managed by syncB()
      const du = document.getElementById('pvp-duel-online');
      const so = document.getElementById('pvp-solo-online');
      if(du) du.textContent = (d.duel||0)+' онлайн';
      if(so) so.textContent = (d.solo||0)+' онлайн';
    }).catch(()=>{});
  }

  /* reset bets page to menu state */
  function _resetBetsState(){
    const bw   = document.getElementById('pvp-bets-wrap');
    const menu = document.getElementById('pvp-menu-block');
    const card = document.getElementById('pvp-menu-bets');
    const duel = document.getElementById('pvp-duel-wrap');
    const solo = document.getElementById('pvp-solo-wrap');
    const mines= document.getElementById('pvp-mines-wrap');
    if (bw)    bw.style.display    = 'none';
    if (card)  card.style.display  = '';
    if (menu)  menu.style.display  = 'block';
    if (duel)  duel.style.display  = 'none';
    if (solo)  solo.style.display  = 'none';
    if (mines) mines.style.display = 'none';
    if (typeof onBetsPageLeave === 'function') onBetsPageLeave();
  }

  /* init when page becomes visible */
  function onPvpPageVisible(){
    _resetBetsState();
    drawMenuSwords();
    drawMenuWheel();
    initLightning();
    initCardPress();
    initMinesFlipCards();
    updateMenuOnline();
    if(window._pvpOnlineTimer) clearInterval(window._pvpOnlineTimer);
    window._pvpOnlineTimer = setInterval(updateMenuOnline, 5000);
  }

  /* ── Mines flip cards animation ── */
  function initMinesFlipCards(){
    const grid = document.getElementById('pvp-mines-flip-grid');
    if(!grid || grid.dataset.init) return;
    grid.dataset.init = '1';
    const types = ['gem','hidden','gem','hidden','mine','hidden','gem','hidden','gem'];
    types.forEach((t, i) => {
      const cell  = document.createElement('div'); cell.className  = 'mines-flip-cell';
      const inner = document.createElement('div'); inner.className = 'mines-flip-inner';
      const front = document.createElement('div'); front.className = 'mines-flip-front';
      const back  = document.createElement('div'); back.className  = 'mines-flip-back ' + t;
      back.textContent = t==='gem' ? '💎' : t==='mine' ? '💣' : '';
      inner.append(front, back); cell.appendChild(inner); grid.appendChild(cell);
      const cycleMs = 2600 + i * 160;
      const initDelay = 200 + i * 300;
      function doFlip(){ inner.classList.add('flipped'); setTimeout(()=>inner.classList.remove('flipped'), cycleMs*0.5); setTimeout(doFlip, cycleMs); }
      setTimeout(doFlip, initDelay);
    });
  }

  // Hook into existing go() navigation
  const _origGo = window.go;
  window.go = function(page){
    // When leaving PvP — reset bets state fully
    const currentPage = document.querySelector('.page.active, .page[style*="block"]');
    const onPvp = document.getElementById('page-pvp') &&
      (document.getElementById('page-pvp').style.display !== 'none' &&
       document.getElementById('page-pvp').classList.contains('active') ||
       window._currentPage === 'pvp');
    if (onPvp && page !== 'pvp') {
      _resetBetsState();
    }
    window._currentPage = page;
    if(_origGo) _origGo(page);
    if(page==='pvp') setTimeout(onPvpPageVisible, 80);
  };
  // Also init on load if pvp is default page
  setTimeout(()=>{ if(document.getElementById('pvp-menu-block')) onPvpPageVisible(); }, 400);
})();
