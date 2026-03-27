import { useApp } from '../../context/AppContext';

const EFFECTS = [
  { id: 'fireworks', name: 'Фейерверк', emoji: '🎆', desc: 'Взрыв конфетти при входе' },
  { id: 'snow',      name: 'Снег',      emoji: '❄️', desc: 'Снежинки падают сверху' },
  { id: 'rain',      name: 'Дождь',     emoji: '🌧️', desc: 'Капли дождя по экрану' },
  { id: 'stars',     name: 'Звёзды',    emoji: '✨', desc: 'Звёздный дождь' },
  { id: 'coins',     name: 'Монеты',    emoji: '🪙', desc: 'Монеты сыпятся вниз' },
  { id: 'hearts',    name: 'Сердца',    emoji: '❤️', desc: 'Сердечки летят вверх' },
];

export default function EffectPicker() {
  const { effectPicker, setEffectPicker, state, updateState, showToast, UID } = useApp();
  if (!effectPicker) return null;

  async function pickEffect(effect) {
    try {
      await fetch('/api/user/effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, effect: effect.id }),
      });
    } catch {}
    const expiry = Date.now() + 30 * 86400000;
    updateState(prev => ({
      entryEffect: effect.id,
      ownedEffects: prev.ownedEffects.includes(effect.id) ? prev.ownedEffects : [...prev.ownedEffects, effect.id],
      effectExpiries: { ...prev.effectExpiries, [effect.id]: expiry },
    }));
    showToast(`🎆 Эффект «${effect.name}» активирован!`, 'g');
    setEffectPicker(false);
  }

  function removeEffect() {
    updateState({ entryEffect: null });
    showToast('Эффект отключён', 'g');
    setEffectPicker(false);
  }

  return (
    <div className="modal-ov show" onClick={e => e.target === e.currentTarget && setEffectPicker(false)}>
      <div className="modal-box">
        <div className="mh"></div>
        <div className="mt">🎆 Эффект входа</div>
        <div className="ms">Выбери анимацию при открытии приложения</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {EFFECTS.map(effect => {
            const hasEffect = state.ownedEffects.includes(effect.id);
            const isActive = state.entryEffect === effect.id;
            return (
              <div
                key={effect.id}
                onClick={() => hasEffect && pickEffect(effect)}
                style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,.06)',
                  border: `2px solid ${isActive ? 'var(--green)' : 'transparent'}`,
                  cursor: hasEffect ? 'pointer' : 'default',
                  opacity: hasEffect ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{ fontSize: '22px' }}>{effect.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{effect.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>{effect.desc}</div>
                </div>
                {isActive && <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>✅</span>}
                {!hasEffect && <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>Купи</span>}
              </div>
            );
          })}
        </div>
        {state.entryEffect && (
          <button className="mbtn gray" onClick={removeEffect} style={{ marginBottom: '8px' }}>Отключить эффект</button>
        )}
        <button className="mbtn gray" onClick={() => setEffectPicker(false)}>Закрыть</button>
      </div>
    </div>
  );
}
