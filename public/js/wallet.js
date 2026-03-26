/* ══════════════════════════════════════════
   wallet.js — TonConnect UI
══════════════════════════════════════════ */

let _tcUI = null;
let _tcReady = false;

async function initTonConnect() {
  let attempts = 0;
  while (!window.TON_CONNECT_UI && attempts < 20) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!window.TON_CONNECT_UI) {
    console.warn('TonConnectUI SDK not loaded');
    if (S.walletAddress) _updateWalletUI(S.walletAddress);
    return;
  }

  try {
    _tcUI = new window.TON_CONNECT_UI.TonConnectUI({
      manifestUrl: window.location.origin + '/tonconnect-manifest.json',
    });

    _tcUI.onStatusChange(wallet => {
      if (wallet) {
        const addr = wallet.account.address;
        const isNew = !S.walletAddress; // first time connecting this session
        S.walletAddress = addr;
        save();
        _updateWalletUI(addr);
        // Complete wallet task whenever freshly connected
        const wTask = TASKS.find(t => t.check === 'wallet' && !S.doneTasks.has(t.id));
        if (wTask) {
          _showWalletBanner();
          completeTask(wTask.id);
        } else if (isNew) {
          _showWalletBanner();
        }
      } else {
        S.walletAddress = null;
        save();
        _updateWalletUI(null);
      }
    });

    // Restore session silently — no toast, no banner
    if (_tcUI.wallet) {
      // If wallet task was reset (doneTasks empty) — disconnect TonConnect so user must reconnect
      const wTask = TASKS.find(t => t.check === 'wallet');
      const walletTaskDone = wTask && S.doneTasks.has(wTask.id);
      if (!walletTaskDone) {
        // Task was reset — force disconnect so the task can be redone
        try { await _tcUI.disconnect(); } catch {}
        S.walletAddress = null;
        save();
        _updateWalletUI(null);
      } else {
        S.walletAddress = _tcUI.wallet.account.address;
        _updateWalletUI(S.walletAddress);
      }
    } else if (S.walletAddress) {
      _updateWalletUI(S.walletAddress);
    }

    _tcReady = true;
  } catch(e) {
    console.warn('TonConnect init error:', e);
    if (S.walletAddress) _updateWalletUI(S.walletAddress);
  }
}

/* One-time success banner shown on profile page */
function _showWalletBanner() {
  const existing = document.getElementById('wallet-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'wallet-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>Кошелёк подключён!</span>
  `;
  banner.style.cssText = `
    position:fixed; top:60px; left:50%; transform:translateX(-50%);
    background:rgba(46,204,113,0.15); border:1px solid rgba(46,204,113,0.35);
    backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    color:#2ecc71; font-size:13px; font-weight:700;
    padding:10px 20px; border-radius:40px;
    display:flex; align-items:center; gap:8px;
    z-index:9999; white-space:nowrap;
    animation:wbIn .3s cubic-bezier(.34,1.56,.64,1) forwards;
  `;
  banner.querySelector('svg').style.cssText = 'width:16px;height:16px;flex-shrink:0';

  // Add keyframe if not present
  if (!document.getElementById('wb-style')) {
    const s = document.createElement('style');
    s.id = 'wb-style';
    s.textContent = `@keyframes wbIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.transition = 'opacity .4s';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 400);
  }, 3000);
}

function _formatAddr(addr) {
  if (!addr || addr.length < 10) return addr || '';
  return addr.slice(0, 6) + '···' + addr.slice(-4);
}

function _updateWalletUI(addr) {
  const val = document.getElementById('wallet-row-v');
  const btn = document.getElementById('wallet-row-btn');
  if (!val) return;
  if (addr) {
    val.textContent = _formatAddr(addr);
    val.style.color = 'var(--green)';
    if (btn) btn.textContent = '✕';
  } else {
    val.textContent = 'Не подключён';
    val.style.color = '';
    if (btn) btn.textContent = '›';
  }
}

/* Disconnect confirm mini-popup */
function _showDisconnectConfirm(onConfirm) {
  const existing = document.getElementById('wallet-confirm');
  if (existing) existing.remove();

  const pop = document.createElement('div');
  pop.id = 'wallet-confirm';
  pop.innerHTML = `
    <div class="wc-inner">
      <div class="wc-title">Отключить кошелёк?</div>
      <div class="wc-addr">${_formatAddr(S.walletAddress)}</div>
      <div class="wc-btns">
        <button class="wc-cancel" onclick="document.getElementById('wallet-confirm').remove()">Отмена</button>
        <button class="wc-ok" id="wc-ok-btn">Отключить</button>
      </div>
    </div>
  `;
  pop.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
    -webkit-backdrop-filter:blur(6px);z-index:9998;
    display:flex;align-items:flex-end;justify-content:center;
    padding-bottom:calc(20px + env(safe-area-inset-bottom));
    animation:fadeIn .15s ease forwards;
  `;
  if (!document.getElementById('wc-style')) {
    const s = document.createElement('style');
    s.id = 'wc-style';
    s.textContent = `
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      .wc-inner{background:rgba(28,30,32,.97);border:1px solid rgba(255,255,255,.08);border-radius:20px;
        padding:20px 20px 16px;width:calc(100% - 32px);max-width:360px;
        animation:slideUp .2s cubic-bezier(.34,1.56,.64,1) forwards;}
      .wc-title{font-size:15px;font-weight:800;color:#f0f0f0;margin-bottom:6px;text-align:center}
      .wc-addr{font-size:11px;color:#777;text-align:center;margin-bottom:16px}
      .wc-btns{display:flex;gap:8px}
      .wc-cancel{flex:1;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.1);
        background:rgba(255,255,255,.06);color:#f0f0f0;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
      .wc-ok{flex:1;padding:11px;border-radius:12px;border:none;
        background:rgba(231,76,60,.2);border:1px solid rgba(231,76,60,.3);
        color:#e74c3c;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
    `;
    document.head.appendChild(s);
  }

  document.getElementById('wc-ok-btn')?.addEventListener('click', () => {
    pop.remove();
    onConfirm();
  });
  pop.addEventListener('click', (e) => { if (e.target === pop) pop.remove(); });
  document.body.appendChild(pop);
  // need to bind after append
  document.getElementById('wc-ok-btn').onclick = () => { pop.remove(); onConfirm(); };
}

async function connectWallet() {
  if (!_tcReady) {
    toast('Загружаем SDK...', 'g');
    await initTonConnect();
    if (!_tcReady) {
      toast('TonConnect недоступен', 'r');
      return;
    }
  }
  try {
    if (_tcUI.wallet) {
      // Show confirm before disconnect
      _showDisconnectConfirm(async () => {
        await _tcUI.disconnect();
        toast('Кошелёк отключён', 'g');
      });
    } else {
      await _tcUI.openModal();
    }
  } catch(e) {
    console.error('connectWallet error:', e);
    toast('Ошибка: ' + e.message, 'r');
  }
}
