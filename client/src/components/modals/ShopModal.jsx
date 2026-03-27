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
  const isNew = !!(item.isNew);
  const icoHtml = ITEM_ICONS[item.icoKey] || '';

  const desc = item.desc || item.description || (() => {
    if (item.vipDays) return `VIP статус на ${item.vipDays} ${item.vipDays === 7 ? 'дней' : 'дней'}. Выделяйся среди других!`;
    if (item.crownDays) return `Надень корону на свой аватар и выделяйся среди друзей.`;
    if (item.special === 'color') return `Измени цвет никнейма на любой из доступных цветов.`;
    if (item.special === 'effect') return `Добавь анимационный эффект при входе в приложение.`;
    return '';
  })();

  return (
    <div id="shopmo" className="show" onClick={e => e.target === e.currentTarget && close()}>
      <div className="shopmo-box" id="shopmo-content">
        <div className="shopmo-confirm-hdr">
          <span className="shopmo-confirm-title">Подтверждение покупки</span>
          <button className="shopmo-confirm-close" onClick={close}>✕</button>
        </div>

        <div className="shopmo-confirm-body">
          <div className="shopmo-confirm-row">
            <div className="shopmo-confirm-thumb">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} />
              ) : (
                <svg viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              )}
            </div>
            <div className="shopmo-confirm-info">
              <div className="shopmo-confirm-name">{item.name}</div>
              {desc && <div className="shopmo-confirm-desc">{desc}</div>}
              <div className="shopmo-confirm-price">
                <svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
                <span className="shopmo-confirm-price-val">{item.price.toLocaleString('ru')}</span>
              </div>
            </div>
          </div>

          {!canAfford && (
            <div className="shopmo-confirm-insuf">
              ❌ Недостаточно монет (нужно ещё {(item.price - state.balance).toLocaleString('ru')} 🪙)
            </div>
          )}

          <button
            onClick={buyItem}
            disabled={!canAfford}
            className={`shopmo-confirm-btn ${!canAfford ? 'shopmo-confirm-btn--nomoney' : isNew ? 'shopmo-confirm-btn--blue' : 'shopmo-confirm-btn--green'}`}
          >
            {canAfford ? `Купить за ${item.price.toLocaleString('ru')} монет` : 'Недостаточно монет'}
          </button>
        </div>
      </div>
    </div>
  );
}
