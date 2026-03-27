import { useApp } from '../../context/AppContext';
import { COLORS } from '../../config/config';

export default function ColorPicker() {
  const { colorPicker, setColorPicker, state, updateState, showToast, UID } = useApp();
  if (!colorPicker) return null;

  async function pickColor(color) {
    try {
      await fetch('/api/user/color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, color: color.id }),
      });
    } catch {}
    updateState({ nickColor: color.id });
    showToast(`🌈 Цвет ника изменён!`, 'g');
    setColorPicker(false);
  }

  return (
    <div className="modal-ov show" onClick={e => e.target === e.currentTarget && setColorPicker(false)}>
      <div className="modal-box">
        <div className="mh"></div>
        <div className="mt">🌈 Цвет ника</div>
        <div className="ms">Выбери цвет для своего имени</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {COLORS.map(color => (
            <div
              key={color.id}
              onClick={() => pickColor(color)}
              style={{
                padding: '12px', borderRadius: '12px',
                background: 'rgba(255,255,255,.06)',
                border: `2px solid ${state.nickColor === color.id ? color.tc : 'transparent'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: color.grad, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: state.nickColor === color.id ? 800 : 500 }}>{color.label}</span>
            </div>
          ))}
        </div>
        <button className="mbtn gray" onClick={() => setColorPicker(false)}>Закрыть</button>
      </div>
    </div>
  );
}
