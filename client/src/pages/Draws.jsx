import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';

export default function Draws() {
  const { state, UID, showToast, syncB } = useApp();
  const [tab, setTab] = useState('active');
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDraws();
    const iv = setInterval(loadDraws, 5000);
    return () => clearInterval(iv);
  }, []);

  async function loadDraws() {
    try {
      const r = await fetch('/api/draws');
      const d = await r.json();
      if (d.ok) setDraws(d.draws || []);
    } catch {}
  }

  async function joinDraw(draw) {
    if ((state.joinedDraws || []).includes(draw.id)) { showToast('Вы уже участвуете!', 'r'); return; }
    if (draw.entryFee && state.balance < draw.entryFee) { showToast('Недостаточно монет', 'r'); return; }
    setLoading(draw.id);
    try {
      const r = await fetch('/api/draws/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, drawId: draw.id }),
      });
      const d = await r.json();
      if (d.ok) {
        syncB(prev => ({ balance: prev.balance - (draw.entryFee || 0), joinedDraws: [...(prev.joinedDraws || []), draw.id] }));
        showToast('🎉 Вы участвуете в розыгрыше!', 'g');
        loadDraws();
      } else {
        showToast(d.error || 'Ошибка', 'r');
      }
    } catch { showToast('Ошибка подключения', 'r'); }
    setLoading(null);
  }

  const active = draws.filter(d => d.status === 'active');
  const finished = draws.filter(d => d.status === 'finished');

  return (
    <div className="page active" id="page-raffles">
      <div className="phdr">
        <div className="ptitle">Розыгрыши</div>
        <BalancePill id="b-raffles">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>

      <div className="stabs" style={{ marginBottom: '12px' }}>
        <button className={`stab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          <svg className="thin" viewBox="0 0 24 24" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" width="14" height="14"><path d="M12 7V20M12 7H8.46429C7.94332 7 7.4437 6.78929 7.07533 6.41421C6.70695 6.03914 6.5 5.53043 6.5 5C6.5 4.46957 6.70695 3.96086 7.07533 3.58579C7.4437 3.21071 7.94332 3 8.46429 3C11.2143 3 12 7 12 7ZM12 7H15.5357C16.0567 7 16.5563 6.78929 16.9247 6.41421C17.293 6.03914 17.5 5.53043 17.5 5C17.5 4.46957 17.293 3.96086 16.9247 3.58579C16.5563 3.21071 16.0567 3 15.5357 3C12.7857 3 12 7 12 7ZM5 12H19V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V12ZM4.6 12H19.4C19.9601 12 20.2401 12 20.454 11.891C20.6422 11.7951 20.7951 11.6422 20.891 11.454C21 11.2401 21 10.9601 21 10.4V8.6C21 8.03995 21 7.75992 20.891 7.54601C20.7951 7.35785 20.6422 7.20487 20.454 7.10899C20.2401 7 19.9601 7 19.4 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V10.4C3 10.9601 3 11.2401 3.10899 11.454C3.20487 11.6422 3.35785 11.7951 3.54601 11.891C3.75992 12 4.03995 12 4.6 12Z" /></svg>
          {' '}Активные
        </button>
        <button className={`stab${tab === 'finished' ? ' active' : ''}`} onClick={() => setTab('finished')}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" width="14" height="14"><path d="M8 21h8M12 17v4M7 4H4v3c0 2.21 1.79 4 4 4M17 4h3v3c0 2.21-1.79 4-4 4M12 17c-3.87 0-7-3.13-7-7V4h14v6c0 3.87-3.13 7-7 7z"/></svg>
          {' '}Завершённые
        </button>
      </div>

      {tab === 'active' && (
        <div id="raffles-active">
          {active.length === 0 ? (
            <div className="raff-empty" id="raffles-empty">
              <div className="raff-empty-ico">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              </div>
              <div className="raff-empty-t">Пока розыгрышей нет</div>
              <div className="raff-empty-s">Скоро здесь появятся призы —<br />следи за обновлениями!</div>
            </div>
          ) : active.map(draw => (
            <DrawCard key={draw.id} draw={draw} joined={(state.joinedDraws || []).includes(draw.id)} balance={state.balance} onJoin={() => joinDraw(draw)} loading={loading === draw.id} />
          ))}
        </div>
      )}
      {tab === 'finished' && (
        <div id="raffles-finished">
          {finished.length === 0 ? (
            <div className="raff-empty">
              <div className="raff-empty-t">Нет завершённых</div>
              <div className="raff-empty-s">Здесь будут прошедшие розыгрыши</div>
            </div>
          ) : finished.map(draw => (
            <DrawCard key={draw.id} draw={draw} finished joined={(state.joinedDraws || []).includes(draw.id)} balance={state.balance} onJoin={() => {}} loading={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function DrawCard({ draw, joined, balance, onJoin, loading, finished }) {
  const canAfford = !draw.entryFee || balance >= draw.entryFee;
  const leftMs = Math.max(0, draw.endsAt - Date.now());
  const h = Math.floor(leftMs / 3600000);
  const m = Math.floor((leftMs % 3600000) / 60000);
  const timeStr = leftMs > 0 ? `${h}ч ${String(m).padStart(2, '0')}м` : 'Завершился';

  return (
    <div className="gc raff-card" style={{ marginBottom: '12px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ fontWeight: 800, fontSize: '15px' }}>{draw.title}</div>
        {!finished && <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>{timeStr}</div>}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--green)', fontWeight: 700, marginBottom: '8px' }}>🏆 {draw.prize}</div>
      {draw.desc && <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '10px', lineHeight: 1.5 }}>{draw.desc}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted2)', marginBottom: '10px' }}>
        <span>👥 Участников: {draw.participants || 0}</span>
        {draw.entryFee ? <span>Взнос: {draw.entryFee.toLocaleString('ru')} 🪙</span> : <span>Бесплатно</span>}
      </div>
      {!finished && (
        <button
          onClick={onJoin}
          disabled={joined || loading || !canAfford}
          style={{
            width: '100%', padding: '11px', borderRadius: '12px', border: 'none',
            background: joined ? 'rgba(46,204,113,.2)' : !canAfford ? 'rgba(255,255,255,.1)' : 'var(--green)',
            color: joined ? 'var(--green)' : !canAfford ? 'var(--muted)' : '#000',
            fontWeight: 800, fontSize: '13px', cursor: joined || !canAfford ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Подождите...' : joined ? '✅ Вы участвуете' : !canAfford ? 'Недостаточно монет' : '🎉 Участвовать'}
        </button>
      )}
      {finished && draw.winner && (
        <div style={{ marginTop: '8px', padding: '10px', borderRadius: '12px', background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>Победитель</div>
          <div style={{ fontWeight: 800, color: '#FFD700' }}>👑 {draw.winner}</div>
        </div>
      )}
    </div>
  );
}
