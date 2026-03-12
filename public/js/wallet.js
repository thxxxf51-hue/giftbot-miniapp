/* ══════════════════════════════════════════
   wallet.js — TonConnect UI
══════════════════════════════════════════ */

let _tcUI = null;
let _tcReady = false;

async function initTonConnect() {
  // Wait for SDK to be available (up to 4s)
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
        S.walletAddress = addr;
        save();
        _updateWalletUI(addr);
        toast('Кошелёк подключён!', 'g', '💎');
      } else {
        S.walletAddress = null;
        save();
        _updateWalletUI(null);
      }
    });

    if (_tcUI.wallet) {
      S.walletAddress = _tcUI.wallet.account.address;
      _updateWalletUI(S.walletAddress);
    } else if (S.walletAddress) {
      _updateWalletUI(S.walletAddress);
    }

    _tcReady = true;
  } catch(e) {
    console.warn('TonConnect init error:', e);
    if (S.walletAddress) _updateWalletUI(S.walletAddress);
  }
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
      await _tcUI.disconnect();
      toast('Кошелёк отключён', 'g');
    } else {
      await _tcUI.openModal();
    }
  } catch(e) {
    console.error('connectWallet error:', e);
    toast('Ошибка: ' + e.message, 'r');
  }
}
