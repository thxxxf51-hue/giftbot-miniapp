import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';
import { COLORS } from '../config/config';

export default function Profile() {
  const { state, UID, TGU, showToast, setColorPicker, setEffectPicker, setStarsModal, syncB, updateState } = useApp();
  const [txList, setTxList] = useState([]);
  const [photoUrl, setPhotoUrl] = useState(TGU.photo_url || null);

  useEffect(() => {
    fetch(`/api/user/photo/${UID}`).then(r => r.json()).then(d => {
      if (d.ok && d.photoUrl) setPhotoUrl(d.photoUrl);
    }).catch(() => {});
    loadTx();
  }, []);

  async function loadTx() {
    try {
      const r = await fetch('/api/transactions?userId=' + UID);
      const d = await r.json();
      if (d.ok) setTxList(d.transactions || []);
    } catch {}
  }

  const vipActive = state.vipExpiry && Date.now() < state.vipExpiry;
  const vipText = vipActive
    ? 'до ' + new Date(state.vipExpiry).toLocaleDateString('ru', { day: 'numeric', month: 'long' })
    : '—';

  const colorLabel = COLORS.find(x => x.id === state.nickColor)?.label || 'Стандартный';
  const effectLabel = state.entryEffect || '—';
  const name = TGU.first_name || 'User';

  return (
    <div className="page active" id="page-profile">
      <div className="phdr">
        <div className="ptitle">Профиль</div>
        <BalancePill id="b-profile">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>

      <div className="gc prn-user">
        <div className="prn-av-wrap" id="av-wrap-p" style={state.legendExpiry && Date.now() < state.legendExpiry ? { '--legend-color': state.legendColor } : {}}>
          <div className="prn-av" id="av-p">
            {photoUrl ? (
              <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} alt="" onError={e => { e.target.parentElement.textContent = name[0].toUpperCase(); }} />
            ) : name[0].toUpperCase()}
          </div>
          {state.hasCrown && <div className="prn-crown show" id="crown-p" />}
          {vipActive && <div className="p-vip-badge" id="p-vip-badge" style={{ display: 'block' }} />}
        </div>
        <div className="prn-info">
          <div className={`prn-name uname ${state.nickColor || 'nc-default'}`} id="p-name-wrap">
            <span id="p-name">{name}</span>
          </div>
          <div className="prn-un" id="p-un">{TGU.username ? '@' + TGU.username : 'Без username'}</div>
          <div className="prn-reg" id="p-reg-row">С нами с {state.regDate || '—'}</div>
        </div>
      </div>

      <div className="gc prn-balrow" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <div style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'rgba(46,204,113,.08)', border: '1px solid rgba(46,204,113,.2)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '4px' }}>Баланс монет</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--green)' }} id="p-bal">{state.balance.toLocaleString('ru')} 🪙</div>
        </div>
        <div style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.2)', cursor: 'pointer' }} onClick={() => setStarsModal(true)}>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '4px' }}>Баланс Stars</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFD700' }} id="p-stars">{state.starsBalance} ⭐</div>
        </div>
      </div>

      <div className="gc" style={{ marginTop: '10px' }}>
        {[
          { label: 'Рефералов', val: (state.refs || []).length, id: 'p-refs' },
          { label: 'VIP статус', val: vipText, id: 'p-vip', click: null },
          { label: 'Цвет ника', val: colorLabel, id: 'p-color', click: () => setColorPicker(true) },
          { label: 'Эффект входа', val: effectLabel, id: 'p-effect', click: () => setEffectPicker(true) },
        ].map((row, i) => (
          <div key={i} className="prn-row" onClick={row.click || undefined} style={{ cursor: row.click ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>{row.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }} id={row.id}>{row.val}</div>
          </div>
        ))}
        <div className="prn-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>Нужна помощь?</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)', cursor: 'pointer' }}>Поддержка</div>
        </div>
      </div>

      {txList.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Транзакции</div>
          <div className="gc" style={{ padding: '8px' }}>
            {txList.slice(0, 20).map((tx, i) => {
              const amt = String(tx.amount);
              const isPos = amt.startsWith('+');
              const isNeg = amt.startsWith('-');
              return (
                <div key={i} className="tx-row">
                  <span><span className="tx-badge">{tx.type}</span></span>
                  <span className={`tx-amt${isPos ? ' pos' : isNeg ? ' neg' : ''}`}>{tx.amount}</span>
                  <span className="tx-det">{tx.details || '—'}</span>
                  <span className="tx-date">{tx.date || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
