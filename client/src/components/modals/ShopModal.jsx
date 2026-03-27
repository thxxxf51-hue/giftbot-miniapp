import { useApp } from '../../context/AppContext';
import { ITEM_ICONS } from '../../config/config';

export default function ShopModal() {
  const { shopModal, setShopModal, state, syncB, showToast, addInv, updateState, setColorPicker, setEffectPicker, UID } = useApp();
  if (!shopModal) return null;
  const { item } = shopModal;

  function close() { setShopModal(null); }

  async function buyItem() {
    if (item.wip) { showToast('Скоро!', 'r'); return; }
    if (state.balance < item.price) { showToast('Недостаточно монет', 'r'); return; }

    try {
      const r = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, itemId: item.id }),
      });
      const d = await r.json();
      if (!d.ok) { showToast(d.error || 'Ошибка', 'r'); return; }
    } catch {}

    syncB(prev => ({ balance: prev.balance - item.price }));

    if (item.vipDays) {
      const now = Date.now();
      const newExp = (state.vipExpiry && state.vipExpiry > now ? state.vipExpiry : now) + item.vipDays * 86400000;
      updateState({ vipExpiry: newExp });
      showToast(`👑 VIP на ${item.vipDays} дней активирован!`, 'g');
    } else if (item.crownDays) {
      addInv('crown', 1);
      showToast('👑 Корона добавлена в инвентарь!', 'g');
    } else if (item.special === 'color') {
      setColorPicker(true);
      showToast('🌈 Выбери цвет ника!', 'g');
    } else if (item.special === 'effect') {
      setEffectPicker(true);
      showToast('🎆 Выбери эффект входа!', 'g');
    } else {
      showToast('✅ Куплено!', 'g');
    }
    close();
  }

  const canAfford = state.balance >= item.price;
  const icoHtml = ITEM_ICONS[item.icoKey] || '';

  return (
    <div id="shopmo" className="show" onClick={e => e.target === e.currentTarget && close()}>
      <div className="shopmo-box" id="shopmo-content">
        {item.imageUrl && (
          <div style={{ width: '100%', height: '160px', backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px 16px 0 0', marginBottom: '16px' }} />
        )}
        {!item.imageUrl && (
          <div className="shopmo-ico" dangerouslySetInnerHTML={{ __html: icoHtml }} style={{ textAlign: 'center', padding: '20px', fontSize: '48px' }} />
        )}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>{item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
            <span style={{ fontWeight: 900, fontSize: '20px' }}>{item.price.toLocaleString('ru')}</span>
          </div>
          {!canAfford && <div style={{ fontSize: '12px', color: '#ff6060', marginBottom: '10px' }}>❌ Недостаточно монет (нужно ещё {(item.price - state.balance).toLocaleString('ru')} 🪙)</div>}
          <button
            onClick={buyItem}
            disabled={!canAfford}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: canAfford ? 'var(--green)' : 'rgba(255,255,255,.15)', color: canAfford ? '#000' : 'var(--muted)', fontWeight: 800, fontSize: '15px', cursor: canAfford ? 'pointer' : 'default', marginBottom: '8px' }}
          >
            {canAfford ? '✅ Купить' : 'Недостаточно монет'}
          </button>
          <button onClick={close} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
