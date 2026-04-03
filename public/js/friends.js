/* ══ FRIENDS ══ */

// ── Task swiper ─────────────────────────────────────────────
let refTaskCur = 0;
let refTaskLocked = false;

function initRefTaskSwiper() {
  const wrap = document.getElementById('ref-task-wrap');
  if (!wrap) return;
  const cards = wrap.querySelectorAll('.tc-card');
  let startX = 0, startY = 0, dragging = false;

  function goTo(idx) {
    if (refTaskLocked) return;
    idx = Math.max(0, Math.min(cards.length - 1, idx));
    if (idx === refTaskCur) return;
    refTaskLocked = true;
    refTaskCur = idx;
    cards.forEach((c, i) => {
      c.dataset.state = i === idx ? 'active' : i < idx ? 'prev' : 'next';
    });
    document.querySelectorAll('.tc-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    setTimeout(() => refTaskLocked = false, 450);
  }

  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; dragging = true;
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > dy && dx > 8) e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchend', e => {
    if (!dragging) return;
    const dx = startX - e.changedTouches[0].clientX;
    const dy = startY - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) goTo(dx > 0 ? refTaskCur + 1 : refTaskCur - 1);
    dragging = false;
  });
}

function _swiperGoTo(idx) {
  const wrap = document.getElementById('ref-task-wrap');
  if (!wrap || refTaskLocked) return;
  const cards = wrap.querySelectorAll('.tc-card');
  idx = Math.max(0, Math.min(cards.length - 1, idx));
  if (idx === refTaskCur) return;
  refTaskLocked = true;
  refTaskCur = idx;
  cards.forEach((c, i) => { c.dataset.state = i === idx ? 'active' : i < idx ? 'prev' : 'next'; });
  document.querySelectorAll('.tc-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  setTimeout(() => refTaskLocked = false, 450);
}

// ── Stats & progress ─────────────────────────────────────────
function rRefStats() {
  // Если задание выполнено но рефы потерялись (редеплой) — показываем минимум 3
  const task3done = S.task3refsDone || S.task3Done || S.refs.length >= 3;
  const task5done = S.task5refsDone || S.task5Done || S.refs.length >= 8;
  const minRefs = task3done ? Math.max(S.refs.length, 3) : S.refs.length;
  // Считаем заработок из рефов если S.refEarned не сохранился
  let calcEarned = S.refEarned || 0;
  if (!calcEarned && S.refs.length > 0) {
    calcEarned = S.refs.length * 1000;
    if (task3done) calcEarned += 2000;
    if (task5done) calcEarned += 5000;
  }
  const minEarned = task3done ? Math.max(calcEarned, S.refs.length * 1000 + 2000) : calcEarned;
  document.getElementById('ref-c1').textContent = minRefs;
  document.getElementById('ref-e').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>${minEarned.toLocaleString('ru')}`;
  document.getElementById('p-refs').textContent = minRefs;

  // Task 0: invite 3
  const cnt3 = Math.min(S.refs.length, 3);
  const pb = document.getElementById('ref-pb');
  if (pb) pb.style.width = (cnt3 / 3 * 100) + '%';
  const pt = document.getElementById('ref-pt');
  if (pt) pt.textContent = cnt3 + ' / 3';

  const done0 = S.task3refsDone || S.task3Done || S.refs.length >= 3;
  const card0 = document.getElementById('rtc-0');
  const tag0  = document.getElementById('rtag-0');
  const rdone0 = document.getElementById('rdone-0');
  if (card0 && done0) {
    card0.classList.add('tc-done');
    if (tag0)  { tag0.className = 'tc-tag done'; tag0.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Выполнено'; }
    if (rdone0) rdone0.style.display = 'flex';
    if (pb)    { pb.style.width = '100%'; pb.classList.add('full'); }
    if (pt)    pt.style.display = 'none';
    // Авто-свайп на карточку 2 если сейчас на карточке 0
    if (refTaskCur === 0) setTimeout(() => _swiperGoTo(1), 600);
  }

  // Task 1: invite 5 more (считаем от всех рефералов после первых 3)
  const refsAfter3 = Math.max(0, S.refs.length - 3);
  const cnt5 = Math.min(refsAfter3, 5);
  const pb2 = document.getElementById('ref-pb2');
  if (pb2) pb2.style.width = (cnt5 / 5 * 100) + '%';
  const pt2 = document.getElementById('ref-pt2');
  if (pt2) pt2.textContent = cnt5 + ' / 5';

  const done1 = S.task5refsDone || S.task5Done || S.refs.length >= 8;
  const card1  = document.getElementById('rtc-1');
  const tag1   = document.getElementById('rtag-1');
  const rdone1 = document.getElementById('rdone-1');
  if (card1 && done1) {
    card1.classList.add('tc-done');
    if (tag1)  { tag1.className = 'tc-tag done'; tag1.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Выполнено'; }
    if (rdone1) rdone1.style.display = 'flex';
    if (pb2)   { pb2.style.width = '100%'; pb2.classList.add('full'); }
    if (pt2)   pt2.style.display = 'none';
    // Авто-свайп на карточку 3 если сейчас на карточке 1
    if (refTaskCur === 1) setTimeout(() => _swiperGoTo(2), 600);
  }
}

// ── Ref list with avatars ─────────────────────────────────────
const _avatarCache = {};
const _AV_COLORS = ['#7aa4f4','#2ecc71','#f4a430','#e74c3c','#9b59b6','#1abc9c','#e67e22'];

function _avatarEl(r, idx) {
  const initial = (r.name||'?').replace('@','').slice(0,1).toUpperCase();
  const bg = _AV_COLORS[idx % _AV_COLORS.length];
  return `<div id="rav-${idx}" style="width:38px;height:38px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">${initial}</div>`;
}

function _loadAvatars() {
  S.refs.forEach((r, i) => {
    if (!r.uid) return;
    const el = document.getElementById('rav-' + i);
    if (!el) return;
    const applyPhoto = (url) => {
      if (!url || !el) return;
      el.innerHTML = '';
      el.style.background = 'transparent';
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.onerror = () => { el.innerHTML = (r.name||'?').replace('@','').slice(0,1).toUpperCase(); el.style.background = _AV_COLORS[i % _AV_COLORS.length]; };
      el.appendChild(img);
    };
    if (_avatarCache[r.uid]) { applyPhoto(_avatarCache[r.uid]); return; }
    if (r.photoUrl) { _avatarCache[r.uid] = r.photoUrl; applyPhoto(r.photoUrl); return; }
    fetch('/api/user/photo/' + r.uid).then(res => res.json()).then(d => {
      if (d.ok && d.photoUrl) { _avatarCache[r.uid] = d.photoUrl; applyPhoto(d.photoUrl); }
    }).catch(() => {});
  });
}

function rRefList() {
  const el = document.getElementById('ref-list'); if (!el) return;
  if (!S.refs.length) {
    el.innerHTML = `<div class="norefs"><div class="nrico"><svg viewBox="0 0 24 24" fill="none" stroke="#363545" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" width="56" height="56"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div class="nrt">Пока нет рефералов</div></div>`;
    return;
  }
  el.innerHTML = S.refs.map((r, i) => `
    <div class="gc" style="padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px">
      ${_avatarEl(r, i)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${r.name||'Пользователь'}</div>
        <div style="font-size:10px;color:var(--muted2)">${r.date||''}</div>
      </div>
      <div style="color:var(--green);font-size:12px;font-weight:700">+1000 <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg></div>
    </div>`).join('');
  setTimeout(_loadAvatars, 50);
}

function copyRef() { navigator.clipboard?.writeText(document.getElementById('ref-link').textContent).catch(()=>{}); toast('📋 Скопировано!','g'); }

function shareRef() {
  const t = document.getElementById('ref-link').textContent;
  const msg = encodeURIComponent('🎁 Присоединяйся к SatApp Gifts — получи 1000 монет!');
  if (tg) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(t)}&text=${msg}`); else copyRef();
}

/* ══ PROMO ══ */
async function usePromo(inputId){
  const el=document.getElementById(inputId);
  const code=(el.value||'').trim().toUpperCase();
  if(!code){toast('Введите промокод','r');return;}
  if(S.usedPromos.has(code)){toast('Уже использован','r',PROMO_ERR_ICO);el.value='';return;}
  el.disabled=true;
  const btn=el.nextElementSibling;
  const oldTxt=btn.textContent;btn.textContent='...';btn.disabled=true;
  try{
    const isVip=S.vipExpiry&&Date.now()<S.vipExpiry;
    const r=await fetch('/api/promo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,userId:UID,isVip})});
    const d=await r.json();
    if(d.ok){S.usedPromos.add(code);S.balance=d.balance;el.value='';syncB();rShopItems();toast(`+${d.reward} монет!`,'g',PROMO_ICO);}
    else{toast((d.error||'Неверный промокод').replace(/[\u{1F000}-\u{1FFFF}]|[\u2000-\u2BFF]|❌|✅/gu,'').trim(),'r',PROMO_ERR_ICO);}
  }catch(e){toast('Ошибка соединения с сервером','r',PROMO_ERR_ICO);}
  el.disabled=false;btn.textContent=oldTxt;btn.disabled=false;
}
