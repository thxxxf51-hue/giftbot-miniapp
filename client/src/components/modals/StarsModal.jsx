import { useApp } from '../../context/AppContext';

const STAR_PACKS = [
  { stars: 10,  coins: 1000,  price: 10  },
  { stars: 50,  coins: 5000,  price: 50  },
  { stars: 100, coins: 11000, price: 100 },
  { stars: 250, coins: 30000, price: 250 },
];

export default function StarsModal() {
  const { starsModal, setStarsModal, state, syncB, showToast, UID, tg } = useApp();
  if (!starsModal) return null;

  function close() { setStarsModal(false); }

  async function buyStars(pack) {
    try {
      const r = await fetch('/api/stars/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, stars: pack.stars }),
      });
      const d = await r.json();
      if (d.ok && d.invoiceUrl) {
        tg?.openInvoice?.(d.invoiceUrl, status => {
          if (status === 'paid') {
            syncB(prev => ({ starsBalance: prev.starsBalance + pack.stars }));
            showToast(`⭐ +${pack.stars} звёзд!`, 'g');
            close();
          }
        });
      } else {
        showToast(d.error || 'Ошибка оплаты', 'r');
      }
    } catch { showToast('Ошибка подключения', 'r'); }
  }

  async function convertStars(pack) {
    if (state.starsBalance < pack.stars) { showToast('Недостаточно Stars', 'r'); return; }
    try {
      await fetch('/api/stars/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, stars: pack.stars, coins: pack.coins }),
      });
    } catch {}
    syncB(prev => ({ starsBalance: prev.starsBalance - pack.stars, balance: prev.balance + pack.coins }));
    showToast(`✅ ${pack.stars} ⭐ → ${pack.coins.toLocaleString('ru')} 🪙`, 'g');
    close();
  }

  return (
    <div className="modal-ov show" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-box" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="mh"></div>
        <div className="mt">Stars ⭐</div>
        <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '16px', textAlign: 'center' }}>
          Ваш баланс: <strong style={{ color: '#FFD700' }}>{state.starsBalance} ⭐</strong>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Купить Stars</div>
        {STAR_PACKS.map(pack => (
          <div key={pack.stars} onClick={() => buyStars(pack)} className="gc" style={{ marginBottom: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontWeight: 700 }}>⭐ {pack.stars} Stars</span>
            <span style={{ fontSize: '13px', color: '#FFD700' }}>{pack.price} Telegram Stars</span>
          </div>
        ))}

        <div style={{ fontSize: '12px', fontWeight: 700, margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Обменять на монеты</div>
        {STAR_PACKS.map(pack => (
          <div key={pack.stars} onClick={() => convertStars(pack)} className="gc" style={{ marginBottom: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: state.starsBalance < pack.stars ? 0.4 : 1 }}>
            <span style={{ fontWeight: 700 }}>⭐ {pack.stars} → 🪙 {pack.coins.toLocaleString('ru')}</span>
            <span style={{ fontSize: '12px', color: 'var(--green)' }}>Обменять</span>
          </div>
        ))}

        <button className="mbtn gray" onClick={close}>Закрыть</button>
      </div>
    </div>
  );
}
