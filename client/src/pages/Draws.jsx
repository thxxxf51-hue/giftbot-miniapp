import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';

/* ── SVG Icons ─────────────────────────────────────── */
const IcoTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4H4v3c0 2.21 1.79 4 4 4M17 4h3v3c0 2.21-1.79 4-4 4M12 17c-3.87 0-7-3.13-7-7V4h14v6c0 3.87-3.13 7-7 7z"/>
  </svg>
);
const IcoPeople = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoCheckCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IcoXCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IcoTelegram = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IcoGift = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
    <line x1="12" y1="22" x2="12" y2="7"/>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);
const IcoCrown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 19h20l-2-10-5 5-3-8-3 8-5-5z"/>
  </svg>
);

/* ── Helpers ─────────────────────────────────────── */
function formatTime(ms) {
  if (ms <= 0) return 'Завершился';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  return `${m}м`;
}

function useCountdown(endsAt) {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 10000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return left;
}

/* ── Main Component ─────────────────────────────── */
export default function Draws() {
  const { state, UID, showToast, syncB } = useApp();
  const [tab, setTab] = useState('active');
  const [draws, setDraws] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDraws = useCallback(async () => {
    try {
      const r = await fetch('/api/draws');
      const d = await r.json();
      if (d.ok) {
        setDraws(d.draws || []);
        setSelected(prev => {
          if (!prev) return null;
          const updated = (d.draws || []).find(x => x.id === prev.id);
          return updated || prev;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDraws();
    const iv = setInterval(loadDraws, 8000);
    return () => clearInterval(iv);
  }, [loadDraws]);

  async function joinDraw(draw) {
    const joinedDraws = state.joinedDraws || [];
    if (joinedDraws.includes(draw.id)) { showToast('Вы уже участвуете!', 'r'); return; }
    if (draw.entryFee && state.balance < draw.entryFee) { showToast('Недостаточно монет', 'r'); return; }
    setLoading(true);
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const r = await fetch('/api/draws/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, drawId: draw.id, username: tg?.username, firstName: tg?.first_name }),
      });
      const d = await r.json();
      if (d.ok) {
        syncB(prev => ({ balance: prev.balance - (draw.entryFee || 0), joinedDraws: [...(prev.joinedDraws || []), draw.id] }));
        showToast('Вы участвуете в розыгрыше!', 'g');
        loadDraws();
        setSelected(null);
      } else {
        showToast(d.errorText || d.error || 'Ошибка', 'r');
      }
    } catch { showToast('Ошибка подключения', 'r'); }
    setLoading(false);
  }

  const active = draws.filter(d => !d.finished && d.status !== 'finished');
  const finished = draws.filter(d => d.finished || d.status === 'finished');

  return (
    <div className="page active" id="page-raffles">
      <div className="phdr">
        <div className="ptitle">Розыгрыши</div>
        <BalancePill id="b-raffles">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>

      <div className="stabs" style={{ marginBottom: '16px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {active.length === 0 ? (
            <div className="raff-empty" style={{ gridColumn: '1/-1' }} id="raffles-empty">
              <div className="raff-empty-ico">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              </div>
              <div className="raff-empty-t">Пока розыгрышей нет</div>
              <div className="raff-empty-s">Скоро здесь появятся призы —<br />следи за обновлениями!</div>
            </div>
          ) : active.map(draw => (
            <CompactDrawCard
              key={draw.id}
              draw={draw}
              joined={(state.joinedDraws || []).includes(draw.id)}
              onClick={() => setSelected(draw)}
            />
          ))}
        </div>
      )}

      {tab === 'finished' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {finished.length === 0 ? (
            <div className="raff-empty">
              <div className="raff-empty-t">Нет завершённых</div>
              <div className="raff-empty-s">Здесь будут прошедшие розыгрыши</div>
            </div>
          ) : finished.map(draw => (
            <FinishedDrawCard key={draw.id} draw={draw} joined={(state.joinedDraws || []).includes(draw.id)} />
          ))}
        </div>
      )}

      {selected && (
        <DrawModal
          draw={selected}
          UID={UID}
          joined={(state.joinedDraws || []).includes(selected.id)}
          balance={state.balance}
          loading={loading}
          onJoin={() => joinDraw(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ── Compact Card (grid item) ───────────────────── */
function CompactDrawCard({ draw, joined, onClick }) {
  const left = useCountdown(draw.endsAt);
  const timeStr = formatTime(left);

  return (
    <div onClick={onClick} style={{
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#1a1a2e',
      cursor: 'pointer',
      position: 'relative',
      aspectRatio: '1/1.15',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.07)',
      transition: 'transform .15s',
      userSelect: 'none',
    }}
    onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Image area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#1a2a4a,#0d1b2a)' }}>
        {draw.imageUrl ? (
          <img src={draw.imageUrl} alt={draw.prize} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoGift />
          </div>
        )}
        {joined && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'rgba(46,204,113,0.9)', borderRadius: '20px',
            padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Участвую
          </div>
        )}
        {(draw.conditions || []).length > 0 && !joined && (
          <div style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'rgba(0,0,0,0.6)', borderRadius: '20px',
            padding: '2px 7px', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            <IcoTelegram />
          </div>
        )}
      </div>

      {/* Prize name */}
      <div style={{
        padding: '8px 10px 4px',
        fontWeight: 800,
        fontSize: '13px',
        color: '#fff',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {draw.prize}
      </div>

      {/* Timer band */}
      <div style={{
        padding: '5px 10px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--green, #2ecc71)',
        fontSize: '11px',
        fontWeight: 700,
      }}>
        <IcoClock />
        {timeStr}
      </div>
    </div>
  );
}

/* ── Finished Draw Card ─────────────────────────── */
function FinishedDrawCard({ draw, joined }) {
  const winners = draw.winners || (draw.winner ? [draw.winner] : []);
  return (
    <div style={{
      borderRadius: '16px', background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden', display: 'flex', gap: 0,
    }}>
      {draw.imageUrl && (
        <div style={{ width: '90px', minHeight: '90px', flexShrink: 0, overflow: 'hidden' }}>
          <img src={draw.imageUrl} alt={draw.prize} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: '12px', flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{draw.prize}</div>
        {winners.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {winners.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#FFD700' }}>
                <IcoCrown />
                <span>{w}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>Победитель не определён</div>
        )}
        {joined && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--green, #2ecc71)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Вы участвовали
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Draw Modal ─────────────────────────────────── */
function DrawModal({ draw, UID, joined, balance, loading, onJoin, onClose }) {
  const left = useCountdown(draw.endsAt);
  const timeStr = formatTime(left);
  const conditions = draw.conditions || [];
  const tgConds = conditions.filter(c => c.type === 'tg' || c.type === 'chat');
  const hasConds = conditions.length > 0;

  const lsKey = `draw_subs_${UID}_${draw.id}`;
  const [subResults, setSubResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) || 'null'); } catch { return null; }
  });
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);

  const canAfford = !draw.entryFee || balance >= draw.entryFee;
  const allSubsMet = tgConds.length === 0 || (subResults && subResults.every(Boolean));
  const allCondsMet = allSubsMet;

  async function checkSubs() {
    if (!tgConds.length) return;
    setChecking(true);
    setCheckError(false);
    try {
      const r = await fetch('/api/draws/check-tg-subs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawId: draw.id, userId: UID }),
      });
      const d = await r.json();
      if (d.ok) {
        const results = d.status || [];
        setSubResults(results);
        localStorage.setItem(lsKey, JSON.stringify(results));
        if (!results.every(Boolean)) setCheckError(true);
      }
    } catch {}
    setChecking(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#16213e',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 32px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Image */}
        {draw.imageUrl ? (
          <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
            <img src={draw.imageUrl} alt={draw.prize} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            width: '100%', height: '100px',
            background: 'linear-gradient(135deg,#1a2a4a,#0d1b2a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
        )}

        <div style={{ padding: '16px 20px 0' }}>
          {/* Prize + stats */}
          <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '6px', lineHeight: 1.2 }}>
            {draw.prize}
          </div>

          <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted2)' }}>
              <IcoPeople />
              {draw.participantsCount || (draw.participants?.length) || 0} участников
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--green, #2ecc71)', fontWeight: 700 }}>
              <IcoClock />
              {timeStr}
            </div>
            {(draw.winnersCount || 1) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#FFD700', fontWeight: 700 }}>
                <IcoCrown />
                {draw.winnersCount} победит.
              </div>
            )}
          </div>

          {draw.entryFee > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)',
              borderRadius: '10px', padding: '5px 10px', marginBottom: '12px',
              fontSize: '12px', color: '#ffc107', fontWeight: 700,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Взнос: {draw.entryFee.toLocaleString('ru')} монет
            </div>
          )}

          {draw.description && (
            <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '14px', lineHeight: 1.55 }}>
              {draw.description}
            </div>
          )}

          {/* ── Conditions ── */}
          {hasConds && !joined && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '14px', padding: '12px', marginBottom: '12px',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Условия участия
              </div>
              {conditions.map((cond, i) => {
                const isTg = cond.type === 'tg' || cond.type === 'chat';
                const tgIdx = tgConds.indexOf(cond);
                const met = isTg && subResults ? subResults[tgIdx] : null;

                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 0',
                    borderBottom: i < conditions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    {/* Status icon */}
                    <div style={{ flexShrink: 0 }}>
                      {met === true ? <IcoCheckCircle /> : met === false ? <IcoXCircle /> : (
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: '1.5px solid rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isTg ? <IcoTelegram /> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: met === true ? '#2ecc71' : met === false ? '#e74c3c' : '#fff' }}>
                      {cond.type === 'custom' ? cond.text : cond.name || cond.channel}
                      {isTg && <span style={{ fontSize: '11px', color: 'var(--muted2)', fontWeight: 400, marginLeft: '4px' }}>{cond.channel}</span>}
                    </div>

                    {/* Subscribe/Join button — hide if met */}
                    {isTg && met !== true && (
                      <a
                        href={cond.url || `https://t.me/${(cond.channel||'').replace('@','')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flexShrink: 0,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: 'rgba(41,182,246,0.15)',
                          border: '1px solid rgba(41,182,246,0.3)',
                          color: '#29b6f6',
                          fontSize: '11px', fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Вступить <IcoExternal />
                      </a>
                    )}
                    {cond.type === 'kick' && (
                      <a
                        href={cond.url || `https://kick.com/${cond.channel}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flexShrink: 0,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: 'rgba(83,213,114,0.15)',
                          border: '1px solid rgba(83,213,114,0.3)',
                          color: '#53d572',
                          fontSize: '11px', fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Вступить <IcoExternal />
                      </a>
                    )}
                  </div>
                );
              })}

              {/* Check subs button */}
              {tgConds.length > 0 && (
                <button
                  onClick={checkSubs}
                  disabled={checking}
                  style={{
                    marginTop: '12px', width: '100%',
                    padding: '10px', borderRadius: '10px', border: 'none',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    cursor: checking ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {checking ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Проверяем...
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                      Проверить подписки
                    </>
                  )}
                </button>
              )}

              {/* Error message */}
              {checkError && subResults && !subResults.every(Boolean) && (
                <div style={{
                  marginTop: '10px', padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(231,76,60,0.1)',
                  border: '1px solid rgba(231,76,60,0.3)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '13px', color: '#e74c3c', fontWeight: 600,
                }}>
                  <IcoXCircle />
                  Вы не выполнили все условия
                </div>
              )}
            </div>
          )}

          {/* ── Already joined ── */}
          {joined ? (
            <div style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              color: '#2ecc71', fontWeight: 800, fontSize: '14px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Вы участвуете
            </div>
          ) : (
            <button
              onClick={onJoin}
              disabled={loading || !canAfford || (hasConds && tgConds.length > 0 && !allCondsMet)}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: !canAfford ? 'rgba(255,255,255,0.1)' :
                  (hasConds && tgConds.length > 0 && !allCondsMet) ? 'rgba(255,255,255,0.08)' :
                  'var(--green, #2ecc71)',
                color: !canAfford ? 'var(--muted)' :
                  (hasConds && tgConds.length > 0 && !allCondsMet) ? 'rgba(255,255,255,0.35)' :
                  '#000',
                fontWeight: 800, fontSize: '15px',
                cursor: loading || !canAfford || (hasConds && tgConds.length > 0 && !allCondsMet) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Подождите...
                </>
              ) : !canAfford ? (
                'Недостаточно монет'
              ) : (
                <>
                  <IcoTrophy />
                  Участвовать
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
