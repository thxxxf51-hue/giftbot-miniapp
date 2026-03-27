import { useEffect, useRef, useCallback } from 'react';
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
      const menu = document.getElementById('pvp-menu-wrap');
      if (menu) menu.style.display = 'block';
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
          <PvpModeCard title="Дуэль" desc="Сразись с другими игроками" icon="⚔️" onAction={() => typeof window.pvpOpenDuel === 'function' && window.pvpOpenDuel()} />
          <PvpModeCard title="Соло" desc="Крути колесо удачи" icon="🎡" onAction={() => typeof window.pvpOpenSolo === 'function' && window.pvpOpenSolo()} />
          <PvpModeCard title="Мины" desc="Открывай клетки, избегай мин" icon="💣" onAction={() => typeof window.pvpOpenMines === 'function' && window.pvpOpenMines()} />
        </div>
      </div>

      <div id="pvp-duel-wrap" style={{ display: 'none' }} />
      <div id="pvp-solo-wrap" style={{ display: 'none' }} />
      <div id="pvp-mines-wrap" style={{ display: 'none' }}>
        <div id="mines-game-root" />
      </div>
      <div id="pvp-bets-wrap" style={{ display: 'none' }} />
    </div>
  );
}

function PvpModeCard({ title, desc, icon, onAction }) {
  const timerRef = useRef(null);
  const pressedRef = useRef(false);
  const cardRef = useRef(null);

  const startPress = useCallback(() => {
    pressedRef.current = false;
    timerRef.current = setTimeout(() => {
      pressedRef.current = true;
      if (cardRef.current) cardRef.current.classList.add('pvp-card--pressed');
    }, 200);
  }, []);

  const endPress = useCallback((e) => {
    clearTimeout(timerRef.current);
    if (cardRef.current) cardRef.current.classList.remove('pvp-card--pressed');
    if (!pressedRef.current) {
      onAction();
    }
    pressedRef.current = false;
  }, [onAction]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
    pressedRef.current = false;
    if (cardRef.current) cardRef.current.classList.remove('pvp-card--pressed');
  }, []);

  return (
    <div
      ref={cardRef}
      className="gc pvp-card"
      tabIndex={-1}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', userSelect: 'none' }}
    >
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
