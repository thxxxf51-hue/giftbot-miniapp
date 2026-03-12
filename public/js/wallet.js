/* ══════════════════════════════════════════
   wallet.js — TonConnect / TonKeeper
══════════════════════════════════════════ */

let _tc = null;  // TonConnect instance

function _tcManifestUrl() {
  return window.location.origin + '/tonconnect-manifest.json';
}

async function initTonConnect() {
  if (!window.TonConnectSDK) return;
  try {
    _tc = new window.TonConnectSDK.TonConnect({
      manifestUrl: _tcManifestUrl()
    });

    // Restore previous session
    await _tc.restoreConnection();

    // Listen for wallet changes
    _tc.onStatusChange(wallet => {
      if (wallet) {
        const addr = wallet.account.address;
        const friendly = _toFriendly(addr);
        S.walletAddress = friendly;
        save();
        _updateWalletUI(friendly);
      } else {
        S.walletAddress = null;
        save();
        _updateWalletUI(null);
      }
    });

    // If already connected on load
    if (_tc.wallet) {
      const friendly = _toFriendly(_tc.wallet.account.address);
      S.walletAddress = friendly;
      _updateWalletUI(friendly);
    } else if (S.walletAddress) {
      _updateWalletUI(S.walletAddress);
    }
  } catch(e) {
    console.warn('TonConnect init error:', e);
  }
}

// Raw hex/base64 address → short display
function _toFriendly(raw) {
  if (!raw) return null;
  // Already looks like UQ... or EQ... friendly
  if (raw.startsWith('UQ') || raw.startsWith('EQ') || raw.startsWith('0Q')) return raw;
  // Truncate raw for display
  return raw.slice(0, 6) + '...' + raw.slice(-4);
}

function _formatAddr(addr) {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + '···' + addr.slice(-4);
}

function _updateWalletUI(addr) {
  const row = document.getElementById('wallet-row-v');
  const btn = document.getElementById('wallet-row-btn');
  if (!row) return;
  if (addr) {
    row.textContent = _formatAddr(addr);
    row.style.color = 'var(--green)';
    if (btn) btn.textContent = '✕';
  } else {
    row.textContent = 'Не подключён';
    row.style.color = '';
    if (btn) btn.textContent = '›';
  }
}

async function connectWallet() {
  if (!_tc) { toast('TonConnect не загружен', 'r'); return; }

  if (_tc.wallet) {
    // Already connected — disconnect
    await _tc.disconnect();
    toast('Кошелёк отключён', 'g');
    return;
  }

  try {
    // Get TonKeeper universal link
    const walletsList = await _tc.getWallets();
    // Prefer TonKeeper
    const tonkeeper = walletsList.find(w =>
      w.name.toLowerCase().includes('tonkeeper') || w.appName?.toLowerCase().includes('tonkeeper')
    ) || walletsList[0];

    if (!tonkeeper) { toast('Кошелёки недоступны', 'r'); return; }

    const universalLink = _tc.connect({
      universalLink: tonkeeper.universalLink,
      bridgeUrl: tonkeeper.bridgeUrl
    });

    // In Telegram Mini App — open deep link directly
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(universalLink, { try_instant_view: false });
    } else {
      window.open(universalLink, '_blank');
    }

    toast('Открываем TonKeeper...', 'g', '💎');
  } catch(e) {
    console.error('connectWallet error:', e);
    toast('Ошибка подключения', 'r');
  }
}
