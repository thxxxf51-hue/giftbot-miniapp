import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import SplashScreen from './components/SplashScreen';
import Navigation from './components/Navigation';
import Toast from './components/Toast';
import GenModal from './components/modals/GenModal';
import CaseModal from './components/modals/CaseModal';
import ShopModal from './components/modals/ShopModal';
import StarsModal from './components/modals/StarsModal';
import ColorPicker from './components/modals/ColorPicker';
import EffectPicker from './components/modals/EffectPicker';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Shop from './pages/Shop';
import Inventory from './pages/Inventory';
import Friends from './pages/Friends';
import Draws from './pages/Draws';
import PVP from './pages/PVP';
import Profile from './pages/Profile';

function PageRenderer({ page }) {
  switch (page) {
    case 'home':      return <Home />;
    case 'tasks':     return <Tasks />;
    case 'shop':      return <Shop />;
    case 'inventory': return <Inventory />;
    case 'friends':   return <Friends />;
    case 'raffles':   return <Draws />;
    case 'pvp':       return <PVP />;
    case 'profile':   return <Profile />;
    default:          return <Home />;
  }
}

export default function App() {
  const {
    splash, setSplash,
    banned, banUntil,
    currentPage,
    UID, TGU,
    showToast, syncB, updateState, go,
    state,
  } = useApp();

  useEffect(() => {
    if (splash) return;
    initUser();
  }, [splash]);

  async function initUser() {
    try {
      const r = await fetch('/api/user/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: UID,
          firstName: TGU.first_name,
          lastName: TGU.last_name,
          username: TGU.username,
          photoUrl: TGU.photo_url,
          refBy: (() => {
            try {
              const p = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
              if (p.startsWith('ref_')) return p.slice(4);
            } catch {}
            return null;
          })(),
        }),
      });
      const d = await r.json();
      if (!d.ok) return;
      if (d.banned) { return; }
      if (d.balance !== undefined) {
        syncB(prev => ({
          balance: Math.max(prev.balance, d.balance || 0),
          starsBalance: d.starsBalance ?? prev.starsBalance,
          vipExpiry: d.vipExpiry ?? prev.vipExpiry,
          nickColor: d.nickColor ?? prev.nickColor,
          hasCrown: d.hasCrown ?? prev.hasCrown,
          legendExpiry: d.legendExpiry ?? prev.legendExpiry,
          refs: d.refs ?? prev.refs,
          refEarned: d.refEarned ?? prev.refEarned,
          refBy: d.refBy ?? prev.refBy,
          walletAddress: d.walletAddress ?? prev.walletAddress,
          entryEffect: d.entryEffect ?? prev.entryEffect,
          ownedEffects: d.ownedEffects ?? prev.ownedEffects,
          effectExpiries: d.effectExpiries ?? prev.effectExpiries,
        }));
      }
    } catch (e) {}
  }

  if (splash) {
    return <SplashScreen onDone={() => setSplash(false)} />;
  }

  if (banned) {
    return (
      <div className="ban-wrap">
        <div className="gc ban-box">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Аккаунт заблокирован</div>
          {banUntil && <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>до {new Date(banUntil).toLocaleString('ru')}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app" id="app">
        <div className="pages" id="pages">
          <PageRenderer page={currentPage} />
        </div>
      </div>
      <Navigation />
      <Toast />
      <GenModal />
      <CaseModal />
      <ShopModal />
      <StarsModal />
      <ColorPicker />
      <EffectPicker />
    </>
  );
}
