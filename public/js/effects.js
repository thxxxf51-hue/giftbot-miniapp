/* ══ ENTRY EFFECTS ══ */
const ENTRY_EFFECTS = [
  { id:'petals',   ico:'🌸', name:'Лепестки' },
  { id:'confetti', ico:'🎊', name:'Конфетти' },
  { id:'snow',     ico:'❄️', name:'Снег'     },
  { id:'meteors',  ico:'💫', name:'Метеоры'  },
];

const EFFECT_PRICE_NORMAL    = 2500;
const EFFECT_PRICE_VIP       = 1000;
const EFFECT_DURATION_NORMAL = 24 * 3600 * 1000;
const EFFECT_DURATION_VIP    = 48 * 3600 * 1000;

const CONFETTI_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bdf','#ff9f43','#a8edea','#ffb347'];
const r = (a, b) => a + Math.random() * (b - a);

/* ══ PARTICLE FACTORY ══ */
function _spawnParticle(type, W) {
  if (type === 'snow')     return { type, x:r(0,W), y:r(-25,-2), vx:r(-0.2,0.2),   vy:r(0.55,1.3),  radius:r(2,4.5) };
  if (type === 'petals')   return { type, x:r(0,W), y:r(-25,-2), vx:r(-0.3,0.3),   vy:r(0.6,1.5),   rot:r(0,Math.PI*2), rotV:r(-0.018,0.018), w:r(4,7),  h:r(2.5,5) };
  if (type === 'confetti') return { type, x:r(0,W), y:r(-25,-2), vx:r(-0.45,0.45), vy:r(0.7,1.8),   rot:r(0,Math.PI*2), rotV:r(-0.045,0.045), w:r(4,9),  h:r(3,6), isRect:Math.random()>0.45, color:CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)] };
  if (type === 'meteors') {
    const fromTop = Math.random() > 0.3;
    const angle   = r(28, 40) * Math.PI / 180;
    return { type, angle, len:r(60,130),
      x: fromTop ? r(-W*0.1, W*1.1)             : r(-70, W*0.25),
      y: fromTop ? r(-20, window.innerHeight*0.55) : r(0,  window.innerHeight*0.55),
      speed: r(6,11)*1.5, progress:-0.15 };
  }
}

/* ══ CANVAS ENGINE ══ */
let _efxRaf = null, _efxSpawnTimer = null, _efxCanvas = null, _efxCtx = null;
let _efxParticles = [], _efxSpawning = false;

function _stopEffect() {
  cancelAnimationFrame(_efxRaf);
  clearTimeout(_efxSpawnTimer);
  _efxSpawning = false;
  _efxRaf = null;
}

function _drawLoop(type, H) {
  const FADE_START = H * 0.42;
  _efxCtx.clearRect(0, 0, _efxCanvas.width, H);

  _efxParticles = _efxParticles.filter(p => {
    if (p.type === 'meteors') {
      p.progress += p.speed / p.len;
      if (p.progress >= 1.2) return false;
      let a;
      if      (p.progress < 0)    a = 0;
      else if (p.progress < 0.2)  a = p.progress / 0.2;
      else if (p.progress < 0.65) a = 1;
      else                        a = Math.max(0, 1 - (p.progress - 0.65) / 0.55);
      const hx = p.x + Math.cos(p.angle)*p.len*p.progress;
      const hy = p.y + Math.sin(p.angle)*p.len*p.progress;
      const tx = hx  - Math.cos(p.angle)*p.len*0.85;
      const ty = hy  - Math.sin(p.angle)*p.len*0.85;
      _efxCtx.save(); _efxCtx.globalAlpha = Math.max(0,a);
      const gr = _efxCtx.createLinearGradient(tx,ty,hx,hy);
      gr.addColorStop(0,'rgba(191,90,242,0)'); gr.addColorStop(0.5,'rgba(191,90,242,0.7)'); gr.addColorStop(1,'rgba(255,255,255,1)');
      _efxCtx.beginPath(); _efxCtx.moveTo(tx,ty); _efxCtx.lineTo(hx,hy);
      _efxCtx.strokeStyle=gr; _efxCtx.lineWidth=1.7; _efxCtx.stroke(); _efxCtx.restore();
      return true;
    }

    p.x += p.vx; p.y += p.vy;
    if (p.rot !== undefined) p.rot += p.rotV;
    let a = 1;
    if (p.y < 12)          a = Math.max(0, p.y / 12);
    if (p.y >= FADE_START) a = Math.max(0, 1 - (p.y - FADE_START) / (H + 15 - FADE_START));
    if (p.y > H+15 || (a <= 0.01 && p.y > FADE_START)) return false;

    _efxCtx.save(); _efxCtx.globalAlpha = Math.min(1, Math.max(0,a));
    if (p.type === 'snow') {
      _efxCtx.beginPath(); _efxCtx.arc(p.x,p.y,p.radius,0,Math.PI*2);
      _efxCtx.fillStyle='rgba(220,240,255,0.95)'; _efxCtx.shadowColor='rgba(190,225,255,0.7)'; _efxCtx.shadowBlur=5; _efxCtx.fill();
    }
    if (p.type === 'petals') {
      _efxCtx.translate(p.x,p.y); _efxCtx.rotate(p.rot);
      const gr = _efxCtx.createRadialGradient(0,0,0,0,0,p.w);
      gr.addColorStop(0,'rgba(255,192,210,0.97)'); gr.addColorStop(1,'rgba(255,105,140,0.5)');
      _efxCtx.beginPath(); _efxCtx.ellipse(0,0,p.w,p.h,0,0,Math.PI*2); _efxCtx.fillStyle=gr; _efxCtx.fill();
    }
    if (p.type === 'confetti') {
      _efxCtx.translate(p.x,p.y); _efxCtx.rotate(p.rot); _efxCtx.fillStyle=p.color;
      if (p.isRect) { _efxCtx.fillRect(-p.w/2,-p.h/2,p.w,p.h); }
      else { _efxCtx.beginPath(); _efxCtx.ellipse(0,0,p.w/2,p.h/2,0,0,Math.PI*2); _efxCtx.fill(); }
    }
    _efxCtx.restore();
    return true;
  });

  if (_efxParticles.length > 0 || _efxSpawning) {
    _efxRaf = requestAnimationFrame(() => _drawLoop(type, H));
  } else {
    _efxCtx.clearRect(0, 0, _efxCanvas.width, _efxCanvas.height);
  }
}

function launchEntryEffect() {
  if (!S.entryEffect) return;
  const expiries = S.effectExpiries || {};
  const exp = expiries[S.entryEffect];
  if (exp && Date.now() > exp) {
    // expired — clear active, but keep in ownedEffects
    S.entryEffect = null; save(); return;
  }
  const type = S.entryEffect;
  _efxCanvas = document.getElementById('effect-canvas');
  if (!_efxCanvas) return;
  const W = window.innerWidth, H = window.innerHeight;
  _efxCanvas.width = W; _efxCanvas.height = H;
  _efxCtx = _efxCanvas.getContext('2d');
  _stopEffect(); _efxParticles = []; _efxSpawning = true;
  const isMeteor = type === 'meteors';
  const interval = isMeteor ? 150 : 65;
  const maxSpawn = isMeteor ? 45  : 85;
  let count = 0;
  function spawnNext() {
    if (!_efxSpawning || count >= maxSpawn) { _efxSpawning = false; return; }
    _efxParticles.push(_spawnParticle(type, W));
    count++;
    _efxSpawnTimer = setTimeout(spawnNext, interval + r(0, isMeteor ? 70 : 30));
  }
  spawnNext();
  setTimeout(() => { _efxSpawning = false; clearTimeout(_efxSpawnTimer); }, 3500);
  _efxRaf = requestAnimationFrame(() => _drawLoop(type, H));
}

/* ══ EFFECT PICKER MODAL ══ */
function openEffectPicker() {
  const isVip  = vipStatus() === 'active';
  const owned  = S.ownedEffects || [];
  const expiries = S.effectExpiries || {};
  const activeExpired = !S.entryEffect || (expiries[S.entryEffect] && Date.now() > expiries[S.entryEffect]);

  const grid = document.getElementById('efx-grid');
  if (!grid) return;

  grid.innerHTML = ENTRY_EFFECTS.map(e => {
    const isCurrent = S.entryEffect === e.id && !activeExpired;
    const isOwned   = owned.includes(e.id);
    const price     = isVip ? EFFECT_PRICE_VIP : EFFECT_PRICE_NORMAL;

    let btnHtml;
    if (isCurrent) {
      // currently active
      const exp = (S.effectExpiries||{})[e.id];
      const hoursLeft = exp ? Math.ceil((exp - Date.now()) / 3600000) : '∞';
      btnHtml = `<div class="efx-active">Активен (${hoursLeft}ч)</div>`;
    } else if (isOwned) {
      // owned but not active — free to switch
      btnHtml = `<button class="efx-buy-btn efx-free" onclick="activateOwnedEffect('${e.id}')">Активировать</button>`;
    } else {
      // not owned — needs purchase
      const canAfford = S.balance >= price;
      btnHtml = `<button class="efx-buy-btn${canAfford ? '' : ' nomoney'}" ${canAfford ? `onclick="confirmBuyEffect('${e.id}')"` : 'disabled'}>${canAfford ? price + ' 🪙' : 'Мало монет'}</button>`;
    }

    return `<div class="efx-card${isCurrent ? ' efx-current' : ''}${isOwned && !isCurrent ? ' efx-owned' : ''}">
      <div class="efx-ico">${e.ico}</div>
      <div class="efx-name">${e.name}</div>
      ${isOwned && !isCurrent ? '<div class="efx-owned-badge">В коллекции</div>' : ''}
      ${btnHtml}
    </div>`;
  }).join('');

  const subtitle = document.getElementById('efx-subtitle');
  if (subtitle) {
    const dur = isVip ? '48' : '24';
    const pr  = isVip ? EFFECT_PRICE_VIP : EFFECT_PRICE_NORMAL;
    subtitle.textContent = `Новый эффект: ${pr} 🪙 • ${dur} часа • Купленные — бесплатно`;
  }

  document.getElementById('efxmo').classList.add('show');
}

function closeEffectPicker() {
  document.getElementById('efxmo').classList.remove('show');
}

/* Activate an already-owned effect (free, just resets timer) */
function activateOwnedEffect(effectId) {
  const isVip = vipStatus() === 'active';
  const dur   = isVip ? EFFECT_DURATION_VIP : EFFECT_DURATION_NORMAL;
  const ef    = ENTRY_EFFECTS.find(e => e.id === effectId);
  if (!ef) return;

  // Close picker first, then confirm
  closeEffectPicker();
  setTimeout(() => {
    const expiries = S.effectExpiries || {};
    const existingExp = expiries[effectId];
    const isExpired = !existingExp || Date.now() > existingExp;
    const hoursLeft = !isExpired ? Math.ceil((existingExp - Date.now()) / 3600000) : null;
    const descText = isExpired
      ? `Активировать бесплатно на ${isVip ? '48' : '24'} ч.`
      : `Осталось ${hoursLeft} ч. — таймер не сбросится`;
    openGenMo(
      `${ef.ico} ${ef.name}`,
      descText,
      `✨ Активировать`,
      () => {
        S.entryEffect = effectId;
        // If expired or never set — start fresh timer. Otherwise keep existing.
        if (isExpired) {
          if (!S.effectExpiries) S.effectExpiries = {};
          S.effectExpiries[effectId] = Date.now() + dur;
        }
        save();
        closeGenMo();
        toast(`${ef.ico} Эффект «${ef.name}» активирован!`, 'g');
        launchEntryEffect();
        updateEffectUI();
      }
    );
  }, 220);
}

/* Buy a new effect (costs coins, adds to owned collection) */
function confirmBuyEffect(effectId) {
  const isVip  = vipStatus() === 'active';
  const price  = isVip ? EFFECT_PRICE_VIP : EFFECT_PRICE_NORMAL;
  const dur    = isVip ? EFFECT_DURATION_VIP : EFFECT_DURATION_NORMAL;
  const ef     = ENTRY_EFFECTS.find(e => e.id === effectId);
  if (!ef || S.balance < price) return;

  // Close picker first, THEN open confirm dialog
  closeEffectPicker();
  setTimeout(() => {
    openGenMo(
      `${ef.ico} ${ef.name}`,
      `Спишется ${price} монет. Активен ${isVip ? '48' : '24'} ч.\nОстанется в коллекции навсегда.`,
      `✨ Купить — ${price} 🪙`,
      () => {
        S.balance -= price;
        S.entryEffect = effectId;
        if (!S.effectExpiries) S.effectExpiries = {};
        S.effectExpiries[effectId] = Date.now() + dur;
        // add to owned collection
        if (!S.ownedEffects) S.ownedEffects = [];
        if (!S.ownedEffects.includes(effectId)) S.ownedEffects.push(effectId);
        syncB(); save();
        closeGenMo();
        toast(`${ef.ico} Эффект «${ef.name}» куплен и активирован!`, 'g');
        launchEntryEffect();
        updateEffectUI();
      }
    );
  }, 220);
}

/* ══ PROFILE ROW UPDATE ══ */
function updateEffectUI() {
  const el = document.getElementById('p-effect');
  if (!el) return;
  const expiries = S.effectExpiries || {};
  const exp = expiries[S.entryEffect];
  const activeExpired = exp && Date.now() > exp;
  const ef = ENTRY_EFFECTS.find(e => e.id === S.entryEffect);
  const active = S.entryEffect && !activeExpired;

  if (active && ef) {
    const hoursLeft = exp ? Math.ceil((exp - Date.now()) / 3600000) : '∞';
    el.innerHTML = `<span style="color:var(--green)">${ef.ico} ${ef.name}</span> <span style="font-size:10px;color:var(--muted2)">(${hoursLeft}ч)</span>`;
  } else if ((S.ownedEffects||[]).length > 0) {
    el.innerHTML = `<span style="color:var(--muted2)">Нет активного</span>`;
  } else {
    el.textContent = '—';
  }

  // show arrow always (anyone can open picker)
  const btn = document.getElementById('p-effect-btn');
  if (btn) btn.style.display = '';
}
