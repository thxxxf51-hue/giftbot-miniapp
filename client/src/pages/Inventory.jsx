import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';
import { INV_DEF } from '../config/config';

export default function Inventory() {
  const { state, showToast, removeInv, syncB, setGenModal, setLegendPicker, setColorPicker } = useApp();

  const keys = Object.keys(state.inventory).filter(k => state.inventory[k] > 0);

  function useItem(key) {
    const d = INV_DEF[key];
    if (!d) return;
    const cnt = state.inventory[key] || 0;
    if (!cnt) return;
    const a = d.action;

    if (a === 'openGift') {
      const coins = Math.floor(Math.random() * 401) + 100;
      setGenModal({
        title: '🎁 Открыть подарок',
        sub: `Получи случайное количество монет (100–500)\nУ вас: ×${cnt}`,
        label: '🎁 Открыть',
        cb: () => {
          removeInv('gift', 1);
          syncB({ balance: state.balance + coins });
          showToast(`🎁 Получено +${coins} монет!`, 'g');
        },
      });
    } else if (a === 'usecrystal') {
      const c = cnt;
      setGenModal({
        title: '💎 Кристаллы скидки',
        sub: `У вас ${c} кристаллов. При 10+ — скидка 50% на VIP 7 дней.${state.vipDiscount ? '\n\n✅ Скидка уже активна!' : ''}`,
        label: c >= 10 && !state.vipDiscount ? '💎 Активировать скидку' : 'Закрыть',
        cb: () => {
          if (c >= 10 && !state.vipDiscount) {
            removeInv('crystal', 10);
            syncB({ vipDiscount: true });
            showToast('💎 Скидка 50% на VIP активирована!', 'g');
          }
        },
      });
    } else if (a === 'activateBonus3') {
      setGenModal({
        title: '⚡ Бонус ×3',
        sub: `Следующий денежный приз в кейсе будет умножен на 3!${state.bonusMulti ? '\n\n⚠️ Уже активен бонус ×' + state.bonusMulti : ''}`,
        label: '⚡ Активировать',
        cb: () => { removeInv('bonus3', 1); syncB({ bonusMulti: 3 }); showToast('⚡ Бонус ×3 активирован!', 'g'); },
      });
    } else if (a === 'activateBonus5') {
      setGenModal({
        title: '🔥 Бонус ×5',
        sub: `Следующий денежный приз в кейсе будет умножен на 5!${state.bonusMulti ? '\n\n⚠️ Уже активен бонус ×' + state.bonusMulti : ''}`,
        label: '🔥 Активировать',
        cb: () => { removeInv('bonus5', 1); syncB({ bonusMulti: 5 }); showToast('🔥 Бонус ×5 активирован!', 'g'); },
      });
    } else if (a === 'useSuper') {
      setGenModal({
        title: '🌟 Супер',
        sub: 'Позволяет сменить цвет ника 1 раз бесплатно.',
        label: '🌟 Выбрать цвет',
        cb: () => { removeInv('super', 1); setColorPicker(true); },
      });
    } else if (a === 'wearCrown') {
      setGenModal({
        title: `👑 Корона ×${cnt}`,
        sub: 'Надень корону на аватарку или обменяй на монеты.',
        label: '👑 Надеть',
        cb: () => { removeInv('crown', 1); syncB({ hasCrown: true }); showToast('👑 Корона надета!', 'g'); },
      });
    } else if (a === 'activateLegendItem') {
      setGenModal({
        title: `✨ Легенда ×${cnt}`,
        sub: 'Активируй свечение вокруг аватарки или обменяй на монеты.',
        label: '✨ Активировать',
        cb: () => { setLegendPicker(true); },
      });
    } else if (a === 'openMegaGift') {
      removeInv('megagift', 1);
      showToast('🎁 Мега-подарок открывается!', 'g');
    }
  }

  return (
    <div className="page active" id="page-inventory">
      <div className="phdr">
        <div className="ptitle">Инвентарь</div>
        <BalancePill id="b-inv">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>
      <div className="inv-grid" id="inv-list">
        {keys.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-ico">📦</div>
            <div className="inv-empty-t">Инвентарь пуст</div>
            <div className="inv-empty-s">Открывай кейсы чтобы получать предметы</div>
          </div>
        ) : keys.map(k => {
          const d = INV_DEF[k] || { ico: '❓', name: k, desc: '' };
          return (
            <div key={k} className="gc inv-item" onClick={() => useItem(k)}>
              <div className="inv-ico">{d.ico}</div>
              <div className="inv-info">
                <div className="inv-name">{d.name}</div>
                <div className="inv-desc">{d.desc}</div>
              </div>
              <div className="inv-cnt">×{state.inventory[k]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
