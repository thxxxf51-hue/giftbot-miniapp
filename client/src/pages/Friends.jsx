import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';

export default function Friends() {
  const { state, UID, TGU, showToast } = useApp();
  const [refs, setRefs] = useState([]);
  const refLink = `https://t.me/SATapp_bot?start=ref_${UID}`;

  useEffect(() => {
    loadRefs();
  }, []);

  async function loadRefs() {
    try {
      const r = await fetch(`/api/refs?userId=${UID}`);
      const d = await r.json();
      if (d.ok) setRefs(d.refs || []);
    } catch {}
  }

  function copyRef() {
    navigator.clipboard.writeText(refLink).catch(() => {});
    showToast('📋 Скопировано!', 'g');
  }

  function shareRef() {
    const text = encodeURIComponent(`Привет! Присоединяйся к SatApp Gifts — открывай кейсы и выигрывай! 🎁`);
    const url = encodeURIComponent(refLink);
    window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/share/url?url=${url}&text=${text}`);
  }

  const refs1 = state.refs || [];
  const refCount = refs1.length;
  const hasTask3 = state.task3refsDone;
  const hasTask5 = state.task5refsDone;
  const pb3 = Math.min(refCount / 3, 1) * 100;
  const pb5 = Math.min(Math.max(refCount - 3, 0) / 5, 1) * 100;

  return (
    <div className="page active" id="page-friends">
      <div className="phdr">
        <div className="ptitle">Рефералы</div>
        <BalancePill id="b-friends">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>

      <div className="refblock">
        <div className="reflbl">Реферальная ссылка</div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' }}>За каждого приглашённого вы получаете</div>
        <div className="refamt">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
          1 000
        </div>
        <div className="refwarn">⚠️ У реферала должен быть @username в Telegram, иначе не засчитается.</div>
        <div className="reflinkrow">
          <div className="reflinkt">{refLink}</div>
          <button className="refcopy" onClick={copyRef}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
        <button className="refshare" onClick={shareRef}>Поделиться в Telegram</button>
      </div>

      <div className="refstats">
        <div className="rstat gc">
          <div className="rslbl">Лично приглашённые</div>
          <div className="rsval">{refCount}</div>
          <div className="rssub">+1000 за каждого</div>
        </div>
        <div className="rstat gc">
          <div className="rslbl">2-й уровень</div>
          <div className="rsval">0</div>
          <div className="rssub">Скоро</div>
        </div>
        <div className="rstat gc">
          <div className="rslbl">Заработано</div>
          <div className="rsval g">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
            {(state.refEarned || 0).toLocaleString('ru')}
          </div>
        </div>
      </div>

      <div className="tc-wrap">
        <div className="tc-swiper" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          <div className={`tc-card${hasTask3 ? ' done' : ''}`} style={{ minWidth: '240px' }}>
            <div className="tc-top">
              <div className={`tc-tag${hasTask3 ? ' done' : ''}`}>{hasTask3 ? '✅ Выполнено' : 'Задание'}</div>
              <div className="tc-prize">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/></svg>
                2 000
              </div>
            </div>
            <div className="tc-title">Пригласи 3 друзей</div>
            <div className="tc-desc">+1000 за каждого + бонус 2000 за выполнение!</div>
            <div className="tc-pb"><div className="tc-pbf" style={{ width: pb3 + '%' }}></div></div>
            <div className="tc-bottom">
              <div className="tc-count">{Math.min(refCount, 3)} / 3</div>
            </div>
          </div>
          <div className={`tc-card${hasTask5 ? ' done' : ''}`} style={{ minWidth: '240px' }}>
            <div className="tc-top">
              <div className={`tc-tag${hasTask5 ? ' done' : ''}`}>{hasTask5 ? '✅ Выполнено' : 'Задание'}</div>
              <div className="tc-prize">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/></svg>
                5 000
              </div>
            </div>
            <div className="tc-title">Пригласи ещё 5 друзей</div>
            <div className="tc-desc">+1000 за каждого + бонус 5000 за выполнение!</div>
            <div className="tc-pb"><div className="tc-pbf" style={{ width: pb5 + '%' }}></div></div>
            <div className="tc-bottom">
              <div className="tc-count">{Math.min(Math.max(refCount - 3, 0), 5)} / 5</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sec">Ваши рефералы</div>
      <div id="ref-list">
        {refs.length === 0 && refs1.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted2)', fontSize: '13px' }}>
            Пока рефералов нет
          </div>
        ) : (refs.length > 0 ? refs : refs1).map((ref, i) => (
          <div key={i} className="gc ref-item" style={{ marginBottom: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(46,204,113,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--green)' }}>
              {(ref.firstName || ref.username || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{ref.firstName || 'Пользователь'}</div>
              {ref.username && <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>@{ref.username}</div>}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>+1000</div>
          </div>
        ))}
      </div>
    </div>
  );
}
