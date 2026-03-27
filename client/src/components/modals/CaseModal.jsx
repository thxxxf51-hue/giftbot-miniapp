import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DROP_ICONS } from '../../config/config';

const SPIN_ITEMS = 40;
const ITEM_W = 110;

function buildTrack(drops) {
  const track = [];
  for (let i = 0; i < SPIN_ITEMS; i++) {
    const drop = drops[Math.floor(Math.random() * drops.length)];
    track.push(drop);
  }
  return track;
}

export default function CaseModal() {
  const { caseModal, setCaseModal, state, syncB, showToast, addInv, UID, tg } = useApp();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [spinCount, setSpinCount] = useState(1);
  const trackRef = useRef(null);

  useEffect(() => {
    if (caseModal) { setResult(null); setSpinning(false); }
  }, [caseModal]);

  if (!caseModal) return null;
  const { caseData: c } = caseModal;

  function close() { setCaseModal(null); setResult(null); setSpinning(false); }

  async function spin() {
    if (spinning) return;
    const price = c.starsPrice ? 0 : c.price * spinCount;
    if (!c.starsPrice && state.balance < price) { showToast('Недостаточно монет', 'r'); return; }

    setSpinning(true);
    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = 'translateX(0)';
    }

    const trackItems = buildTrack(c.drops);
    const winIdx = Math.floor(SPIN_ITEMS * 0.6) + Math.floor(Math.random() * 8);
    const winDrop = trackItems[winIdx];

    if (trackRef.current) {
      trackRef.current.innerHTML = trackItems.map(d => `
        <div class="rtrack-item" style="width:${ITEM_W}px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;background:rgba(255,255,255,.04);border-radius:12px;border:1px solid rgba(255,255,255,.06)">
          <div style="width:40px;height:40px;color:${c.ic}">${DROP_ICONS[d.icoKey] || '❓'}</div>
          <div style="font-size:11px;font-weight:700;color:${c.ic}">${d.v}</div>
          <div style="font-size:10px;color:var(--muted2)">${d.n}</div>
        </div>
      `).join('');
    }

    try { tg?.HapticFeedback?.impactOccurred('medium'); } catch {}

    const offset = winIdx * (ITEM_W + 8) - (160 - ITEM_W / 2);
    setTimeout(() => {
      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 4s cubic-bezier(.17,.67,.12,1)';
        trackRef.current.style.transform = `translateX(-${offset}px)`;
      }
    }, 50);

    setTimeout(async () => {
      setSpinning(false);
      try { tg?.HapticFeedback?.notificationOccurred('success'); } catch {}

      let reward = winDrop.coins || 0;
      if (reward && state.bonusMulti > 1) {
        reward = reward * state.bonusMulti;
        syncB({ bonusMulti: 0 });
      }

      if (winDrop.inv) addInv(winDrop.inv, winDrop.cnt || 1);
      if (reward) {
        syncB(prev => ({ balance: prev.balance - price + reward }));
      } else {
        if (price > 0) syncB(prev => ({ balance: prev.balance - price }));
      }

      try {
        await fetch('/api/case/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: UID, caseId: c.id, win: winDrop }),
        });
      } catch {}

      setResult(winDrop);
    }, 4200);
  }

  const price = c.starsPrice ? `${c.starsPrice} ⭐` : (c.price * spinCount).toLocaleString('ru') + ' 🪙';
  const canAfford = c.starsPrice ? true : state.balance >= c.price * spinCount;

  return (
    <div className={`cmo show`} id="cmo">
      <div className="cmbox">
        <div className="cmhdr">
          <div className="cmtitle">{c.name}</div>
          <button className="cmclose" onClick={close}>✕</button>
        </div>

        {!result ? (
          <div id="cm-spin">
            <div className="rw" id="rw1" style={{ overflow: 'hidden', position: 'relative' }}>
              <div
                ref={trackRef}
                className="rtrack"
                style={{ display: 'flex', gap: '8px', willChange: 'transform' }}
              />
              <div className="rcline"></div>
            </div>

            <div className="spin-count-row">
              <span className="spin-cnt-lbl">Прокрутов:</span>
              {[1, 2, 3].map(n => (
                <button key={n} className={`spin-cnt-btn${spinCount === n ? ' sel' : ''}`} onClick={() => setSpinCount(n)}>×{n}</button>
              ))}
            </div>

            <div className="cmfoot">
              <div className="cmcost">{price}</div>
              <button
                className="cmspin"
                id="cm-btn"
                onClick={spin}
                disabled={spinning || !canAfford}
                style={{ opacity: spinning || !canAfford ? 0.6 : 1 }}
              >
                {spinning ? '⏳ Крутится...' : '🎰 Открыть кейс'}
              </button>
            </div>
          </div>
        ) : (
          <div className="cres">
            <span className="cres-ico">{result.icoKey === 'coins' ? '🪙' : result.icoKey === 'vip' ? '👑' : '🎁'}</span>
            <div className="cres-t">Поздравляем!</div>
            <div className="cres-s">
              {result.coins ? `+${result.coins} монет${state.bonusMulti > 1 ? ` (×${state.bonusMulti} бонус!)` : ''}` : result.v}
            </div>
            <button className="cres-btn" onClick={close}>Забрать</button>
          </div>
        )}
      </div>
    </div>
  );
}
