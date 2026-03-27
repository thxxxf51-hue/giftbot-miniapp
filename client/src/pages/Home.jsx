import { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';

function countUp(setVal, target, duration = 800) {
  const steps = 40;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const t = step / steps;
    const ease = 1 - Math.pow(1 - t, 3);
    setVal(Math.round(ease * target).toLocaleString('ru'));
    if (step >= steps) { clearInterval(timer); setVal(target.toLocaleString('ru')); }
  }, duration / steps);
}

export default function Home() {
  const { state, go, showToast, markPromoUsed, syncB, UID } = useApp();
  const [stats, setStats] = useState({ users: '—', earned: '—' });
  const [draws, setDraws] = useState([]);
  const [promoInput, setPromoInput] = useState('');

  useEffect(() => {
    fetch('/api/global-stats')
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        countUp(v => setStats(s => ({ ...s, users: v })), d.users);
        countUp(v => setStats(s => ({ ...s, earned: v })), d.totalEarned);
      })
      .catch(() => {});
    loadDraws();
    const iv = setInterval(loadDraws, 5000);
    return () => clearInterval(iv);
  }, []);

  async function loadDraws() {
    try {
      const r = await fetch('/api/draws');
      const d = await r.json();
      if (d.ok) setDraws((d.draws || []).filter(x => x.status === 'active').slice(0, 3));
    } catch {}
  }

  async function usePromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (state.usedPromos.has(code)) { showToast('Промокод уже использован', 'r'); return; }
    try {
      const r = await fetch('/api/promo/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, code }),
      });
      const d = await r.json();
      if (d.ok) {
        syncB({ balance: state.balance + (d.reward || 0) });
        markPromoUsed(code);
        showToast(`🎁 Промокод активирован! +${d.reward} монет`, 'g');
        setPromoInput('');
      } else {
        showToast(d.error || 'Промокод не найден', 'r');
      }
    } catch { showToast('Ошибка подключения', 'r'); }
  }

  return (
    <div className="page active" id="page-home">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div className="huser">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <div className="welcome">Добро пожаловать,</div>
              <div className={`uname ${state.nickColor || 'nc-default'}`}>
                <span>{window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'User'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hbal-row">
          <div className="stars-pill" onClick={() => {}}>
            <span className="star-ico">⭐</span><span>{state.starsBalance}</span>
          </div>
          <BalancePill id="b-home">{state.balance.toLocaleString('ru')}</BalancePill>
        </div>
      </div>

      <div className="hm-stats-row">
        <div className="hm-stat-card">
          <div className="hm-stat-body">
            <div className="hm-stat-lbl">Пользователей</div>
            <div className="hm-stat-val">{stats.users}</div>
          </div>
          <div className="hm-stat-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-body">
            <div className="hm-stat-lbl">Монет заработано</div>
            <div className="hm-stat-val">{stats.earned}</div>
          </div>
          <div className="hm-stat-ico hm-stat-ico--gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
          </div>
        </div>
      </div>

      <div className="hm-grid">
        {[
          { id: 'tasks',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, t: 'Задания',   s: 'Выполняй и зарабатывай' },
          { id: 'shop',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>, t: 'Магазин',   s: 'Трать монеты' },
          { id: 'raffles',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>, t: 'Розыгрыши', s: 'Испытай удачу' },
          { id: 'friends',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, t: 'Рефералы',  s: 'Приглашай друзей' },
          { id: 'inventory', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, t: 'Инвентарь', s: 'Твои предметы и бонусы', full: true },
        ].map(item => (
          <div key={item.id} className={`hm-card${item.full ? ' hm-card--full' : ''}`} onClick={() => go(item.id)}>
            <svg className="hm-ico" viewBox={item.icon.props.viewBox} fill="none" stroke="currentColor" strokeWidth={item.icon.props.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
              {item.icon.props.children}
            </svg>
            <div className="hm-t">{item.t}</div>
            <div className="hm-s">{item.s}</div>
          </div>
        ))}
      </div>

      <div className="hm-promo">
        <div className="hm-promo-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hm-promo-ico"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          <span>Промокод</span>
        </div>
        <div className="hm-promo-row">
          <input
            className="hm-promo-input"
            placeholder="Введите промокод"
            autoCapitalize="characters"
            value={promoInput}
            onChange={e => setPromoInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && usePromo()}
          />
          <button className="hm-promo-btn" onClick={usePromo}>Применить</button>
        </div>
      </div>

      <div className="hm-section-hdr">
        <span className="hm-section-title">Активные розыгрыши</span>
        <button className="hm-section-all" onClick={() => go('raffles')}>Все</button>
      </div>
      <div id="h-raf-block">
        {draws.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', opacity: .4, gap: '8px' }}>
            <div style={{ width: '40px', height: '40px', color: 'var(--green)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Пока розыгрышей нет</div>
          </div>
        ) : draws.map(draw => (
          <DrawPreviewCard key={draw.id} draw={draw} />
        ))}
      </div>
    </div>
  );
}

function DrawPreviewCard({ draw }) {
  const totalMs = draw.endsAt - draw.createdAt;
  const leftMs = Math.max(0, draw.endsAt - Date.now());
  const pct = totalMs > 0 ? Math.max(0, 100 - (leftMs / totalMs) * 100) : 100;
  const h = Math.floor(leftMs / 3600000);
  const m = Math.floor((leftMs % 3600000) / 60000);
  const timeStr = leftMs > 0 ? `${h}ч ${String(m).padStart(2, '0')}м` : 'Завершается';

  return (
    <div className="gc raff-card" style={{ marginBottom: '10px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{draw.title}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>{timeStr}</div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 700, marginBottom: '6px' }}>{draw.prize}</div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,.08)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'var(--green)', borderRadius: '2px', transition: 'width 1s' }}></div>
      </div>
    </div>
  );
}
