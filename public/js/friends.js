/* ══ FRIENDS ══ */

// ── Task swiper ─────────────────────────────────────────────
const REF_TASKS = [
  { id: 0, need: 3, bonus: 2000, doneFlag: 'task3Done' },
  { id: 1, need: 5, bonus: 5000, doneFlag: 'task5Done', offset: 3 }, // нужно 5 НОВЫХ после task3
];

let refTaskCur = 0;
let refTaskLocked = false;

function initRefTaskSwiper() {
  const wrap = document.getElementById('ref-task-wrap');
  if (!wrap) return;
  const cards = wrap.querySelectorAll('.ref-tc');
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
    document.querySelectorAll('.rtdot').forEach((d, i) => d.classList.toggle('active', i === idx));
    setTimeout(() => refTaskLocked = false, 450);
  }

  // Init states
  cards.forEach((c, i) => { c.dataset.state = i === 0 ? 'active' : 'next'; });

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

// ── Stats & progress ─────────────────────────────────────────
function rRefStats() {
  document.getElementById('ref-c1').textContent = S.refs.length;
  document.getElementById('ref-e').innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${S.refEarned.toLocaleString('ru')}`;
  document.getElementById('p-refs').textContent = S.refs.length;

  // Task 0: invite 3
  const cnt3 = Math.min(S.refs.length, 3);
  const pb = document.getElementById('ref-pb');
  if (pb) pb.style.width = (cnt3 / 3 * 100) + '%';
  const pt = document.getElementById('ref-pt');
  if (pt) pt.textContent = cnt3 + ' / 3';

  const done0 = S.task3refsDone || S.task3Done;
  const card0 = document.getElementById('rtc-0');
  const tag0 = document.getElementById('rtag-0');
  const rdone0 = document.getElementById('rdone-0');
  if (card0 && done0) {
    card0.classList.add('done-card');
    if (tag0) tag0.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Выполнено';
    if (tag0) tag0.style.cssText = 'background:rgba(46,204,113,.12);color:#2ecc71;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600';
    if (rdone0) rdone0.style.display = 'flex';
    if (pb) { pb.style.width = '100%'; pb.style.background = 'linear-gradient(90deg,#2ecc71,#00e5ff)'; }
    if (pt) pt.style.display = 'none';
    // Скрываем стрелку если следующая карточка не нужна (но она есть - оставим)
  }

  // Task 1: invite 5 more (after task3)
  const refsAfter3 = Math.max(0, S.refs.length - 3);
  const cnt5 = Math.min(refsAfter3, 5);
  const pb2 = document.getElementById('ref-pb2');
  if (pb2) pb2.style.width = (cnt5 / 5 * 100) + '%';
  const pt2 = document.getElementById('ref-pt2');
  if (pt2) pt2.textContent = cnt5 + ' / 5';

  const done1 = S.task5refsDone || S.task5Done;
  const card1 = document.getElementById('rtc-1');
  const tag1 = document.getElementById('rtag-1');
  const rdone1 = document.getElementById('rdone-1');
  if (card1 && done1) {
    card1.classList.add('done-card');
    if (tag1) tag1.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Выполнено';
    if (tag1) tag1.style.cssText = 'background:rgba(46,204,113,.12);color:#2ecc71;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600';
    if (rdone1) rdone1.style.display = 'flex';
    if (pb2) { pb2.style.width = '100%'; pb2.style.background = 'linear-gradient(90deg,#2ecc71,#00e5ff)'; }
    if (pt2) pt2.style.display = 'none';
  }

  // Скрываем стрелку на последней карточке
  const arr1 = document.getElementById('rtc-arr-1');
  if (arr1) arr1.style.display = 'none'; // карточка 3 — "в разработке", стрелка не нужна
}

// ── Ref list with avatars ────────────────────────────────────
const _avatarCache = {}; // uid → photoUrl

const _AV_COLORS = ['#7aa4f4','#2ecc71','#f4a430','#e74c3c','#9b59b6','#1abc9c','#e67e22'];

function _avatarEl(r, idx) {
  const initial = (r.name||'?').replace('@','').slice(0,1).toUpperCase();
  const bg = _AV_COLORS[idx % _AV_COLORS.length];
  const id = 'rav-' + idx;
  // Placeholder сразу (инициал), потом заменим на фото если есть
  return `<div id="${id}" style="width:38px;height:38px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">${initial}</div>`;
}

function _loadAvatars() {
  S.refs.forEach((r, i) => {
    if (!r.uid) return;
    const uid = r.uid;
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

    // Используем кеш если есть
    if (_avatarCache[uid]) { applyPhoto(_avatarCache[uid]); return; }

    // Если в ref уже есть photoUrl — пробуем его
    if (r.photoUrl) {
      _avatarCache[uid] = r.photoUrl;
      applyPhoto(r.photoUrl);
      return;
    }

    // Иначе запрашиваем с сервера
    fetch('/api/user/photo/' + uid)
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.photoUrl) {
          _avatarCache[uid] = d.photoUrl;
          applyPhoto(d.photoUrl);
        }
      })
      .catch(() => {});
  });
}

function rRefList() {
  const el = document.getElementById('ref-list'); if (!el) return;
  if (!S.refs.length) {
    el.innerHTML = `<div class="norefs"><div class="nrico">👥</div><div class="nrt">Пока нет рефералов</div></div>`;
    return;
  }
  el.innerHTML = S.refs.map((r, i) => `
    <div class="gc" style="padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px">
      ${_avatarEl(r, i)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${r.name||'Пользователь'}</div>
        <div style="font-size:10px;color:var(--muted2)">${r.date||''}</div>
      </div>
      <div style="color:var(--green);font-size:12px;font-weight:700">+1000 🪙</div>
    </div>`).join('');

  // Подгружаем реальные аватарки асинхронно
  setTimeout(_loadAvatars, 50);
}

function copyRef() { navigator.clipboard?.writeText(document.getElementById('ref-link').textContent).catch(()=>{}); toast('📋 Скопировано!','g'); }

function shareRef() {
  const t = document.getElementById('ref-link').textContent;
  const msg = encodeURIComponent('🎁 Присоединяйся к GiftBot — получи 1000 монет!');
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
