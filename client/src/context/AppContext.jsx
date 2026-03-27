import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { TGU, UID, tg } from '../hooks/useTelegram';

const AppContext = createContext(null);

const SK = 'gb4_' + UID;

function loadStorage() {
  try {
    const d = JSON.parse(localStorage.getItem(SK) || '{}');
    return d.v === 5 ? d : null;
  } catch { return null; }
}

function saveStorage(state) {
  try {
    localStorage.setItem(SK, JSON.stringify({
      v: 5,
      balance: state.balance,
      starsBalance: state.starsBalance,
      doneTasks: [...state.doneTasks],
      usedPromos: [...state.usedPromos],
      regDate: state.regDate,
      refs: state.refs,
      refEarned: state.refEarned,
      refBy: state.refBy,
      vipExpiry: state.vipExpiry,
      nickColor: state.nickColor,
      hasCrown: state.hasCrown,
      legendExpiry: state.legendExpiry,
      legendColor: state.legendColor,
      inventory: state.inventory,
      bonusMulti: state.bonusMulti,
      vipDiscount: state.vipDiscount,
      task3refsDone: state.task3refsDone,
      task5refsDone: state.task5refsDone,
      entryEffect: state.entryEffect,
      effectExpiries: state.effectExpiries,
      ownedEffects: state.ownedEffects,
      walletAddress: state.walletAddress,
      localTx: state.localTx || [],
      joinedDraws: state.joinedDraws || [],
    }));
  } catch {}
}

const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function buildInitialState(sv) {
  const existingExpiries = sv?.effectExpiries || {};
  if (sv?.entryEffect && sv?.entryEffectExpiry && !existingExpiries[sv.entryEffect]) {
    existingExpiries[sv.entryEffect] = sv.entryEffectExpiry;
  }
  return {
    balance: sv?.balance ?? 1000,
    starsBalance: sv?.starsBalance ?? 0,
    doneTasks: new Set(sv?.doneTasks || []),
    usedPromos: new Set(sv?.usedPromos || []),
    regDate: sv?.regDate || today,
    refs: sv?.refs || [],
    refEarned: sv?.refEarned || 0,
    refBy: sv?.refBy || null,
    vipExpiry: sv?.vipExpiry || null,
    nickColor: sv?.nickColor || '',
    hasCrown: sv?.hasCrown || false,
    legendExpiry: sv?.legendExpiry || null,
    legendColor: sv?.legendColor || '#2ecc71',
    inventory: sv?.inventory || {},
    bonusMulti: sv?.bonusMulti || 0,
    vipDiscount: sv?.vipDiscount || false,
    task3refsDone: sv?.task3refsDone || false,
    task5refsDone: sv?.task5refsDone || false,
    entryEffect: sv?.entryEffect || null,
    effectExpiries: existingExpiries,
    ownedEffects: sv?.ownedEffects || [],
    walletAddress: sv?.walletAddress || null,
    localTx: sv?.localTx || [],
    joinedDraws: sv?.joinedDraws || [],
  };
}

export function AppProvider({ children }) {
  const sv = loadStorage();
  const [state, setState] = useState(() => buildInitialState(sv));
  const [toast, setToast] = useState({ msg: '', type: 'g', show: false });
  const [currentPage, setCurrentPage] = useState('home');
  const [genModal, setGenModal] = useState(null);
  const [starsModal, setStarsModal] = useState(false);
  const [caseModal, setCaseModal] = useState(null);
  const [shopModal, setShopModal] = useState(null);
  const [drawModal, setDrawModal] = useState(null);
  const [colorPicker, setColorPicker] = useState(false);
  const [effectPicker, setEffectPicker] = useState(false);
  const [legendPicker, setLegendPicker] = useState(false);
  const [banned, setBanned] = useState(false);
  const [banUntil, setBanUntil] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [splash, setSplash] = useState(true);
  const toastTimerRef = useRef(null);
  const bSyncTimerRef = useRef(null);

  const showToast = useCallback((msg, type = 'g') => {
    setToast({ msg, type, show: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }, []);

  const updateState = useCallback((patch) => {
    setState(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveStorage(next);
      return next;
    });
  }, []);

  const syncBalanceToServer = useCallback((nextState) => {
    clearTimeout(bSyncTimerRef.current);
    bSyncTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/balance/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: UID, balance: nextState.balance, starsBalance: nextState.starsBalance }),
        });
      } catch {}
    }, 1000);
  }, []);

  const syncB = useCallback((patch) => {
    setState(prev => {
      const next = typeof patch === 'function'
        ? { ...prev, ...patch(prev) }
        : (patch ? { ...prev, ...patch } : prev);
      saveStorage(next);
      syncBalanceToServer(next);
      return next;
    });
  }, [syncBalanceToServer]);

  const vipStatus = useCallback(() => {
    if (!state.vipExpiry) return 'none';
    return Date.now() < state.vipExpiry ? 'active' : 'expired';
  }, [state.vipExpiry]);

  const addBalance = useCallback((amount) => {
    syncB(prev => ({ balance: (prev?.balance ?? state.balance) + amount }));
  }, [state.balance, syncB]);

  const spendBalance = useCallback((amount) => {
    syncB(prev => ({ balance: Math.max(0, (prev?.balance ?? state.balance) - amount) }));
  }, [state.balance, syncB]);

  const addInv = useCallback((key, cnt) => {
    updateState(prev => ({
      inventory: { ...prev.inventory, [key]: (prev.inventory[key] || 0) + cnt },
    }));
  }, [updateState]);

  const removeInv = useCallback((key, cnt = 1) => {
    updateState(prev => {
      const newCount = Math.max(0, (prev.inventory[key] || 0) - cnt);
      const newInv = { ...prev.inventory };
      if (newCount === 0) delete newInv[key];
      else newInv[key] = newCount;
      return { inventory: newInv };
    });
  }, [updateState]);

  const invCount = useCallback((key) => state.inventory[key] || 0, [state.inventory]);

  const markTaskDone = useCallback((id) => {
    updateState(prev => ({ doneTasks: new Set([...prev.doneTasks, id]) }));
  }, [updateState]);

  const markPromoUsed = useCallback((code) => {
    updateState(prev => ({ usedPromos: new Set([...prev.usedPromos, code]) }));
  }, [updateState]);

  const go = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  return (
    <AppContext.Provider value={{
      state, updateState, syncB, showToast,
      toast, setToast,
      currentPage, go,
      genModal, setGenModal,
      starsModal, setStarsModal,
      caseModal, setCaseModal,
      shopModal, setShopModal,
      drawModal, setDrawModal,
      colorPicker, setColorPicker,
      effectPicker, setEffectPicker,
      legendPicker, setLegendPicker,
      banned, setBanned, banUntil, setBanUntil,
      accessDenied, setAccessDenied,
      splash, setSplash,
      vipStatus, addBalance, spendBalance,
      addInv, removeInv, invCount,
      markTaskDone, markPromoUsed,
      TGU, UID, tg,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
