/* ══ MINES GAME ══ */

const MINES_GRID = 25;
let _minesCount = 3;
let _minesBet = 500;
let _minesPlaying = false;
let _minesMinePos = new Set();
let _minesOpened = 0;
let _minesMult = 1.0;

function initMinesPage() {
  const root = document.getElementById('mines-game-root');
  if (!root || root.dataset.init) return;
  root.dataset.init = '1';
  root.innerHTML = _minesRenderHTML();
  _minesBindEvents();
  _minesBuildGrid();
  _minesUpdateUI();
}

function _minesRenderHTML() {
  return `
  <!-- multiplier strip -->
  <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div>
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Множитель</div>
      <div id="mines-mult-val" style="font-family:var(--font-head,sans-serif);font-size:26px;font-weight:900;background:linear-gradient(135deg,#2ecc71,#1abc9c);-webkit-background-clip:text;-webkit-text-fill-color:transparent">1.00×</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Выигрыш</div>
      <div id="mines-profit-val" style="font-size:15px;font-weight:800;color:#2ecc71">—</div>
    </div>
  </div>

  <!-- mines count -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.35);white-space:nowrap">💣 Мин:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${[1,3,5,10,15,20].map(n=>`<div class="mines-pill${n===3?' mines-pill-active':''}" onclick="minesSetCount(${n})" data-n="${n}">${n}</div>`).join('')}
    </div>
  </div>

  <!-- bet row -->
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
    <input id="mines-bet-input" class="mines-bet-inp" type="number" value="500" min="10">
    <div style="display:flex;gap:6px">
      <div class="mines-bq" onclick="minesMultBet(0.5)">½</div>
      <div class="mines-bq" onclick="minesMultBet(2)">×2</div>
      <div class="mines-bq" onclick="minesSetMax()">MAX</div>
    </div>
  </div>

  <!-- grid -->
  <div id="mines-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:12px"></div>

  <!-- buttons -->
  <button id="mines-start-btn" onclick="minesStart()" style="width:100%;height:50px;border-radius:14px;background:linear-gradient(135deg,#5b8def,#3a6bdf);border:none;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:.2px;margin-bottom:8px">Начать игру</button>
  <button id="mines-cashout-btn" onclick="minesCashOut()" disabled style="width:100%;height:50px;border-radius:14px;background:linear-gradient(135deg,#2ecc71,#1abc9c);border:none;color:#000;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:.2px;display:none">Забрать выигрыш</button>

  <!-- result sheet -->
  <div id="mines-result" style="display:none;margin-top:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:20px;text-align:center">
    <div id="mines-result-ico" style="font-size:44px;margin-bottom:8px"></div>
    <div id="mines-result-title" style="font-family:var(--font-head,sans-serif);font-size:18px;font-weight:900;margin-bottom:4px"></div>
    <div id="mines-result-sub" style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px"></div>
    <button onclick="minesReset()" style="width:100%;height:44px;border-radius:12px;background:linear-gradient(135deg,#2ecc71,#1abc9c);border:none;color:#000;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">Играть снова</button>
  </div>
  `;
}

function _minesBindEvents() {
  // bet input live update
  const inp = document.getElementById('mines-bet-input');
  if (inp) inp.addEventListener('input', () => { _minesBet = Math.max(10, parseInt(inp.value)||10); });
}

function _minesBuildGrid() {
  const grid = document.getElementById('mines-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < MINES_GRID; i++) {
    const cell = document.createElement('div');
    cell.className = 'mines-cell';
    cell.dataset.idx = i;
    cell.onclick = () => minesOpenCell(i);
    grid.appendChild(cell);
  }
}

function _calcMult(opened, mines) {
  if (opened === 0) return 1.0;
  let m = 1.0;
  for (let i = 0; i < opened; i++) m *= (MINES_GRID - mines - i) / (MINES_GRID - i);
  return Math.max(1.01, parseFloat((0.97 / m).toFixed(2)));
}

function _minesUpdateUI() {
  const mult = document.getElementById('mines-mult-val');
  const profit = document.getElementById('mines-profit-val');
  if (mult) {
    mult.textContent = _minesMult.toFixed(2) + '×';
    mult.style.animation = 'none';
    void mult.offsetWidth;
    mult.style.animation = 'mines-bump .25s ease';
  }
  if (profit) {
    profit.innerHTML = _minesOpened > 0 ? '+' + Math.round(_minesBet * _minesMult).toLocaleString('ru') + '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0;margin-left:3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>' : '—';
  }
  // cashout btn
  const co = document.getElementById('mines-cashout-btn');
  if (co) co.disabled = (_minesOpened === 0 || !_minesPlaying);
}

function minesSetCount(n) {
  if (_minesPlaying) return;
  _minesCount = n;
  document.querySelectorAll('.mines-pill').forEach(p => {
    p.classList.toggle('mines-pill-active', parseInt(p.dataset.n) === n);
  });
}

function minesMultBet(f) {
  if (_minesPlaying) return;
  const inp = document.getElementById('mines-bet-input');
  if (!inp) return;
  inp.value = Math.max(10, Math.round(parseFloat(inp.value || 0) * f / 10) * 10);
  _minesBet = parseInt(inp.value);
}

function minesSetMax() {
  if (_minesPlaying) return;
  const inp = document.getElementById('mines-bet-input');
  if (!inp) return;
  inp.value = S.balance;
  _minesBet = S.balance;
}

function minesStart() {
  _minesBet = parseInt(document.getElementById('mines-bet-input')?.value || 500);
  if (_minesBet > S.balance) { toast('Недостаточно монет', 'r', '💸'); return; }
  if (_minesBet < 10) { toast('Минимум 10 монет', 'r', '⚠️'); return; }

  S.balance -= _minesBet; syncB();

  // place mines
  _minesMinePos = new Set();
  while (_minesMinePos.size < _minesCount) _minesMinePos.add(Math.floor(Math.random() * MINES_GRID));

  _minesOpened = 0; _minesMult = 1.0; _minesPlaying = true;
  _minesBuildGrid();

  document.getElementById('mines-start-btn').style.display = 'none';
  const co = document.getElementById('mines-cashout-btn');
  if (co) { co.style.display = ''; co.disabled = true; }
  document.getElementById('mines-result').style.display = 'none';

  // lock controls
  document.querySelectorAll('.mines-pill,.mines-bq,#mines-bet-input').forEach(e => e.style.opacity = '0.4');

  _minesUpdateUI();
}

function minesOpenCell(idx) {
  if (!_minesPlaying) return;
  const cell = document.querySelector(`.mines-cell[data-idx="${idx}"]`);
  if (!cell || cell.dataset.open) return;
  cell.dataset.open = '1';

  if (_minesMinePos.has(idx)) {
    // BOOM
    cell.className = 'mines-cell mines-cell-mine';
    cell.innerHTML = '<span style="font-size:18px;filter:drop-shadow(0 0 6px rgba(231,76,60,.9))">💣</span>';
    _minesPlaying = false;
    // reveal all mines
    setTimeout(() => {
      _minesMinePos.forEach(mi => {
        if (mi === idx) return;
        const mc = document.querySelector(`.mines-cell[data-idx="${mi}"]`);
        if (mc && !mc.dataset.open) { mc.className = 'mines-cell mines-cell-mine-reveal'; mc.innerHTML = '<span style="font-size:16px;opacity:.6">💣</span>'; }
      });
      _minesShowResult(false, 0);
    }, 450);
  } else {
    // GEM
    cell.className = 'mines-cell mines-cell-gem';
    cell.innerHTML = '<span class="mines-gem-ico">💎</span>';
    _minesOpened++;
    _minesMult = _calcMult(_minesOpened, _minesCount);
    _minesUpdateUI();

    const co = document.getElementById('mines-cashout-btn');
    if (co) co.disabled = false;

    // All safe cells opened = auto win
    if (_minesOpened === MINES_GRID - _minesCount) {
      _minesPlaying = false;
      const win = Math.round(_minesBet * _minesMult);
      S.balance += win; syncB();
      _recordBigWin(win);
      const _minesNet = win - _minesBet;
      if(_minesNet>0)fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:_minesNet})}).catch(()=>{});
      setTimeout(() => _minesShowResult(true, win, true), 300);
    }
  }
}

function minesCashOut() {
  if (!_minesPlaying || _minesOpened === 0) return;
  _minesPlaying = false;
  const win = Math.round(_minesBet * _minesMult);
  S.balance += win; syncB();
  _recordBigWin(win);
  const _net = win - _minesBet;
  if(_net>0)fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:_net})}).catch(()=>{});
  // reveal mines
  _minesMinePos.forEach(mi => {
    const mc = document.querySelector(`.mines-cell[data-idx="${mi}"]`);
    if (mc && !mc.dataset.open) { mc.className = 'mines-cell mines-cell-mine-reveal'; mc.innerHTML = '<span style="font-size:16px;opacity:.6">💣</span>'; }
  });
  _minesShowResult(true, win);
}

function _recordBigWin(amount) {
  if (amount < 30000) return;
  fetch('/api/wins/record', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId: UID, amount, game: 'mines' })
  }).catch(() => {});
}

function _minesShowResult(win, amount, perfect) {
  const res = document.getElementById('mines-result');
  if (!res) return;
  document.getElementById('mines-result-ico').textContent = win ? (perfect ? '🏆' : '💰') : '💣';
  document.getElementById('mines-result-title').innerHTML = win
    ? (perfect ? 'Идеальная игра!' : '+' + amount.toLocaleString('ru') + '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0;margin-left:3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>')
    : 'Взрыв!';
  document.getElementById('mines-result-sub').innerHTML = win
    ? `Множитель ${_minesMult.toFixed(2)}× · Ставка ${_minesBet.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0;margin-left:3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`
    : `Ставка ${_minesBet.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0;margin-left:3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg> проиграна`;
  const co = document.getElementById('mines-cashout-btn');
  if (co) { co.disabled = true; co.style.display = 'none'; }
  res.style.display = 'block';
}

function minesReset() {
  _minesPlaying = false; _minesOpened = 0; _minesMult = 1.0; _minesMinePos = new Set();
  _minesBuildGrid();
  document.getElementById('mines-mult-val').textContent = '1.00×';
  document.getElementById('mines-profit-val').textContent = '—';
  document.getElementById('mines-start-btn').style.display = '';
  const co = document.getElementById('mines-cashout-btn');
  if (co) { co.style.display = 'none'; co.disabled = true; }
  document.getElementById('mines-result').style.display = 'none';
  document.querySelectorAll('.mines-pill,.mines-bq,#mines-bet-input').forEach(e => e.style.opacity = '');
}
