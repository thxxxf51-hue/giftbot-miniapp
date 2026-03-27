import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';

export default function PVP() {
  const { state, currentPage } = useApp();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (currentPage !== 'pvp') {
      ['pvp-duel-wrap', 'pvp-solo-wrap', 'pvp-mines-wrap', 'pvp-bets-wrap'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      if (typeof window.onPvpPageLeave === 'function') window.onPvpPageLeave();
      return;
    }
    if (mountedRef.current) {
      if (typeof window.onPvpPageEnter === 'function') window.onPvpPageEnter();
    }
    mountedRef.current = true;
  }, [currentPage]);

  return (
    <div className="page active" id="page-pvp">
      <div className="phdr">
        <div className="ptitle">PvP</div>
        <BalancePill id="b-pvp">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>

      <div id="pvp-menu-wrap">
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted2)', marginBottom: '16px' }}>Выбери режим игры</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PvpModeCard title="Дуэль" desc="Сразись с другими игроками" icon="⚔️" onClick={() => typeof window.pvpOpenDuel === 'function' && window.pvpOpenDuel()} />
          <PvpModeCard title="Соло" desc="Крути колесо удачи" icon="🎡" onClick={() => typeof window.pvpOpenSolo === 'function' && window.pvpOpenSolo()} />
          <PvpModeCard title="Мины" desc="Открывай клетки, избегай мин" icon="💣" onClick={() => typeof window.pvpOpenMines === 'function' && window.pvpOpenMines()} />
        </div>
      </div>

      <div id="pvp-duel-wrap" style={{ display: 'none' }}>
      </div>
      <div id="pvp-solo-wrap" style={{ display: 'none' }}>
      </div>
      <div id="pvp-mines-wrap" style={{ display: 'none' }}>
        <div id="mines-game-root"></div>
      </div>
      <div id="pvp-bets-wrap" style={{ display: 'none' }}>
      </div>
    </div>
  );
}

function PvpModeCard({ title, desc, icon, onClick }) {
  const timerRef = useRef(null);
  const isLongRef = useRef(false);
  const cardRef = useRef(null);

  function onDown() {
    isLongRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongRef.current = true;
      if (cardRef.current) cardRef.current.classList.add('pvp-card--pressed');
    }, 200);
  }
  function onUp() {
    clearTimeout(timerRef.current);
    if (cardRef.current) cardRef.current.classList.remove('pvp-card--pressed');
    if (!isLongRef.current) onClick();
    isLongRef.current = false;
  }
  function onCancel() {
    clearTimeout(timerRef.current);
    isLongRef.current = false;
    if (cardRef.current) cardRef.current.classList.remove('pvp-card--pressed');
  }

  return (
    <div ref={cardRef} className="gc pvp-card" onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onCancel} onPointerCancel={onCancel} style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', userSelect: 'none' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
        {icon}
      </div>
      <div>
        <div className="pvp-card-title" style={{ fontWeight: 800, fontSize: '16px', marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>{desc}</div>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  );
}
