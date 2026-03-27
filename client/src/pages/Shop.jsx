import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';
import { ITEMS, CASES, ITEM_ICONS, DROP_ICONS } from '../config/config';

export default function Shop() {
  const { state, go, showToast, setCaseModal, setShopModal, syncB, updateState, addInv, UID } = useApp();
  const [tab, setTab] = useState('items');
  const [customItems, setCustomItems] = useState([]);
  const [customCases, setCustomCases] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const d = await fetch('/api/shop/custom').then(r => r.json());
        if (d.ok) {
          setCustomItems(d.items || []);
          setCustomCases(d.cases || []);
        }
      } catch {}
    }
    load();
  }, []);

  const allItems = [...ITEMS, ...customItems];
  const allCases = [...CASES, ...customCases];

  function openCase(c) {
    if (c.wip) { showToast('Скоро!', 'r'); return; }
    setCaseModal({ caseData: c });
  }

  function openItem(item) {
    setShopModal({ item });
  }

  return (
    <div className="page active" id="page-shop">
      <div className="phdr">
        <div className="ptitle">Магазин</div>
        <BalancePill id="b-shop">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>
      <div className="stabs" id="shop-stabs">
        <button className={`stab${tab === 'items' ? ' active' : ''}`} onClick={() => setTab('items')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
          <span className="stab-text"> Магазин</span>
        </button>
        <button className={`stab${tab === 'cases' ? ' active' : ''}`} onClick={() => setTab('cases')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span className="stab-text"> Кейсы</span>
        </button>
      </div>

      {tab === 'items' && (
        <div className="sgrid" id="shop-items">
          {allItems.map(item => (
            <ShopItemCard key={item.id} item={item} balance={state.balance} onBuy={() => openItem(item)} />
          ))}
        </div>
      )}

      {tab === 'cases' && (
        <div className="cgrid" id="shop-cases">
          {allCases.map(c => (
            <CaseCard key={c.id} caseData={c} balance={state.balance} onOpen={() => openCase(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShopItemCard({ item, balance, onBuy }) {
  const icoHtml = ITEM_ICONS[item.icoKey] || '';
  const canAfford = balance >= item.price;

  return (
    <div className="gc sitem" onClick={onBuy}>
      {item.imageUrl ? (
        <div className="sitem-img" style={{ backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100px', borderRadius: '10px', marginBottom: '10px' }} />
      ) : (
        <div className="sitem-ico" dangerouslySetInnerHTML={{ __html: icoHtml }} />
      )}
      <div className="sitem-name">{item.name}</div>
      <div className={`sitem-price${canAfford ? '' : ' cant'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>
        {item.price.toLocaleString('ru')}
      </div>
    </div>
  );
}

function CaseCard({ caseData: c, balance, onOpen }) {
  const canAfford = c.starsPrice ? false : balance >= c.price;
  const priceStr = c.starsPrice ? `${c.starsPrice} ⭐` : c.price.toLocaleString('ru') + ' 🪙';

  return (
    <div className="gc ccard" style={{ background: c.bg, cursor: 'pointer' }} onClick={onOpen}>
      {c.photo && (
        <div className="ccard-img" style={{ backgroundImage: `url(${c.photo})`, backgroundPosition: c.photoPos || 'center', backgroundSize: 'cover', height: '110px', borderRadius: '10px', marginBottom: '10px' }} />
      )}
      <div className="ccard-name" style={{ color: c.ic, fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>{c.name}</div>
      <div className="ccard-drops" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
        {c.drops.slice(0, 4).map((d, i) => (
          <div key={i} className="ccard-drop" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '6px', background: c.ib, color: c.ic }}>
            {d.v}
          </div>
        ))}
      </div>
      <button className={`ccard-btn${canAfford ? '' : ' cant'}`} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: c.ic, color: '#000', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
        {c.wip ? '⏳ Скоро' : priceStr}
      </button>
    </div>
  );
}
