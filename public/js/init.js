
/* ═══ SWIPE TO ENTER ═══ */
function initSwipe(){
  const track=document.getElementById('sw-track');
  const thumb=document.getElementById('sw-thumb');
  const success=document.getElementById('sw-success');
  if(!track||!thumb)return;
  let drag=false,sx=0,cx=0;
  function mx(){return track.offsetWidth-44;}
  function setX(x){
    x=Math.max(0,Math.min(x,mx()));cx=x;
    thumb.style.transform='translateX('+x+'px)';
    const arr=document.querySelector('.sw-arrows');
    if(arr)arr.style.opacity=Math.max(0,(1-x/mx()*2.5)*.42);
    if(x>=mx()-4)swipeDone();
  }
  function swipeDone(){
    thumb.style.transform='translateX('+mx()+'px)';
    if(success)success.classList.add('show');
    try{localStorage.setItem('gb4_swiped','1');}catch(e){}
    setTimeout(function(){
      const sw=document.getElementById('swipe-screen');
      if(sw){sw.classList.add('hide');setTimeout(function(){sw.style.display='none';},500);}
      if(typeof window._swipeDoneCallback==='function') window._swipeDoneCallback();
    },400);
  }
  function reset(){
    if(cx<mx()-4){
      thumb.style.transition='transform .35s cubic-bezier(.22,1,.36,1)';
      cx=0;thumb.style.transform='translateX(0)';
      setTimeout(function(){thumb.style.transition='';},350);
      const arr=document.querySelector('.sw-arrows');
      if(arr)arr.style.opacity='';
    }
  }
  thumb.addEventListener('mousedown',function(e){drag=true;sx=e.clientX-cx;thumb.style.animation='none';e.preventDefault();});
  window.addEventListener('mousemove',function(e){if(drag)setX(e.clientX-sx);});
  window.addEventListener('mouseup',function(){if(drag){drag=false;reset();}});
  thumb.addEventListener('touchstart',function(e){drag=true;sx=e.touches[0].clientX-cx;thumb.style.animation='none';e.preventDefault();},{passive:false});
  window.addEventListener('touchmove',function(e){if(drag){setX(e.touches[0].clientX-sx);e.preventDefault();}},{passive:false});
  window.addEventListener('touchend',function(){if(drag){drag=false;reset();}});
}

/* ══ BAN SCREEN ══ */
let _banTimer = null;

function showBanScreen(until) {
  document.querySelector('.app').style.display = 'none';

  const ban = document.createElement('div');
  ban.id = 'ban-screen';
  ban.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;font-family:-apple-system,sans-serif;';

  const isPermanent = !until || until === 0;

  ban.innerHTML = `
    <div style="font-size:64px;margin-bottom:20px">🚫</div>
    <div style="font-size:22px;font-weight:800;color:#ff6060;margin-bottom:10px;text-align:center">Вы заблокированы</div>
    <div style="font-size:14px;color:#555;text-align:center;line-height:1.6;margin-bottom:28px;max-width:280px">Ваш аккаунт заблокирован администратором</div>
    ${isPermanent ? `
      <div style="background:rgba(255,96,96,.1);border:1px solid rgba(255,96,96,.3);border-radius:16px;padding:18px 28px;text-align:center">
        <div style="font-size:11px;color:#777;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Срок блокировки</div>
        <div style="font-size:20px;font-weight:800;color:#ff6060">Навсегда</div>
      </div>
    ` : `
      <div style="background:rgba(255,96,96,.1);border:1px solid rgba(255,96,96,.3);border-radius:16px;padding:18px 28px;text-align:center;min-width:220px">
        <div style="font-size:11px;color:#777;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Осталось до разбана</div>
        <div id="ban-countdown" style="font-size:28px;font-weight:900;color:#ff6060;font-variant-numeric:tabular-nums">--:--</div>
        <div id="ban-date" style="font-size:11px;color:#555;margin-top:6px"></div>
      </div>
    `}
    <div style="margin-top:32px;font-size:11px;color:#333;text-align:center">По вопросам обратитесь к администратору</div>
  `;

  document.body.appendChild(ban);

  if (!isPermanent) {
    const dateEl = document.getElementById('ban-date');
    if (dateEl) dateEl.textContent = 'До ' + new Date(until).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});

    function tick() {
      const diff = until - Date.now();
      if (diff <= 0) { clearInterval(_banTimer); location.reload(); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById('ban-countdown');
      if (el) el.textContent = h > 0
        ? `${h}ч ${String(m).padStart(2,'0')}м ${String(s).padStart(2,'0')}с`
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    tick();
    _banTimer = setInterval(tick, 1000);
  }
}

/* ══ СБРОС localStorage ══ */
function hardReset() {
  // Используем SK (определён в core.js) — гарантированно правильный ключ
  try {
    localStorage.removeItem(SK);
    // Также чистим кеш уведомлений
    localStorage.removeItem('gb4_notifs_' + UID);
  } catch {}
  // Небольшая задержка чтобы localStorage точно очистился
  setTimeout(() => location.reload(), 50);
}

/* ══ ACCESS CHECK ══ */
async function checkAccess(){
  try{
    const r=await fetch(`/api/access/check?userId=${UID}`);
    const d=await r.json();
    if(d.ok && d.allowed===false){
      document.querySelector('.app').style.display='none';
      const el=document.getElementById('access-denied');
      if(el) el.classList.add('show');
      return false;
    }
  }catch{}
  return true;
}

/* ══ INIT ══ */
async function init(){
  // Проверяем доступ перед загрузкой приложения
  const hasAccess = await checkAccess();
  if(!hasAccess) return;

  const name=TGU.first_name||'User';
  const uname=TGU.username?'@'+TGU.username:'Без username';
  function setAv(id, url){
    const el=document.getElementById(id);if(!el)return;
    if(url){el.innerHTML=`<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.parentElement.textContent='${name[0].toUpperCase()}'">`;}
    else{el.textContent=name[0].toUpperCase();}
  }
  setAv('av-h', TGU.photo_url||null);setAv('av-p', TGU.photo_url||null);
  // Получаем реальное фото с сервера (Telegram не даёт photo_url в WebApp)
  fetch(`/api/user/photo/${UID}`).then(r=>r.json()).then(d=>{
    if(d.ok && d.photoUrl){ setAv('av-h', d.photoUrl); setAv('av-p', d.photoUrl); }
  }).catch(()=>{});
  document.getElementById('h-name').textContent=name;
  document.getElementById('p-name').textContent=name;
  // sync nick color wrap on profile
  const pnw=document.getElementById('p-name-wrap');
  if(pnw)pnw.className='prn-name uname '+(S.nickColor||'nc-default');
  document.getElementById('p-un').textContent=uname;
  const pregRow = document.getElementById('p-reg-row');
  if(pregRow) pregRow.textContent = 'С нами с ' + (S.regDate || '—');
  // VIP badge on avatar
  const vipBadge = document.getElementById('p-vip-badge');
  if(vipBadge) {
    const vipActive = S.vipExpiry && Date.now() < S.vipExpiry;
    vipBadge.style.display = vipActive ? 'block' : 'none';
  }
  // tx count hint
  const txCount = document.getElementById('p-tx-count');
  if(txCount && S.transactions) txCount.textContent = S.transactions.length ? S.transactions.length + ' записей' : 'Нет';
  document.getElementById('p-refs').textContent=S.refs.length;
  document.getElementById('ref-link').textContent=`https://t.me/SATapp_bot?start=ref_${UID}`;
  applyNick(S.nickColor);
  applyCrown();
  applyLegend();
  // TON wallet restore
  initTonConnect();
  updateVipUI();
  updateEffectUI();
  syncB();
  try {
    const ct = await fetch('/api/tasks/custom').then(r=>r.json());
    if(Array.isArray(ct) && ct.length){
      ct.forEach(t=>{ if(!TASKS.find(x=>x.id===t.id)) TASKS.push(t); });
    }
  } catch{}
  // Применяем overrides к статическим заданиям
  try{
    const ov=await fetch('/api/tasks/overrides').then(r=>r.json());
    if(ov && typeof ov==='object' && !ov.error){
      const allowed=['rew','name','desc','tag','tc','order'];
      for(const [id,fields] of Object.entries(ov)){
        const t=TASKS.find(x=>x.id===parseInt(id));
        if(t) allowed.forEach(k=>{ if(fields[k]!==undefined) t[k]=fields[k]; });
        // Store in _taskOverrides for openTask to use
        _taskOverrides[parseInt(id)]=fields;
      }
    }
  }catch{}
  renderTasks();
  loadCustomShopItems();
  rCases();
  rRefStats();
  rRefList();
  initRefTaskSwiper();
  document.getElementById('pi-h').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-h');});
  document.getElementById('pi-p').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-p');});

  try{
    const sr=await fetch('/api/user/sync',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'',balance:S.balance,starsBalance:S.starsBalance,vipExpiry:S.vipExpiry||null,photoUrl:TGU.photo_url||null,localRefs:S.refs||[],localRefEarned:S.refEarned||0,localTask3Done:!!(S.task3refsDone||S.task3Done),localTask5Done:!!(S.task5refsDone||S.task5Done)})});
    const sd=await sr.json();
    if(sd.ok){
      // Бан
      if(sd.banned){ showBanScreen(sd.banUntil); return; }

      // Сброс статистики — очищаем localStorage и перезагружаемся (не для администратора)
      if(sd.reset && UID !== (typeof ADMIN_UID !== 'undefined' ? ADMIN_UID : '')){
        hardReset();
        return;
      }

      S.balance=sd.balance;
      if(sd.starsBalance!==undefined)S.starsBalance=sd.starsBalance;
      // Применяем рефералов с сервера — не затираем локальные если сервер вернул пустые
      if(sd.refs!==undefined){
        if(sd.refs.length > 0 || S.refs.length === 0) S.refs=sd.refs;
        document.getElementById('p-refs').textContent=S.refs.length; rRefList(); rRefStats();
      }
      if(sd.refEarned!==undefined) S.refEarned=sd.refEarned;
      if(sd.task3Done) S.task3refsDone=true;
      if(sd.task5Done) S.task5refsDone=true;
      save();
      syncB();
    }
  }catch{}

  loadDraws();
  setInterval(loadDraws,5000);

  // Launch entry effect if active
  launchEntryEffect();

  // Проверка бана каждые 30 сек
  setInterval(async()=>{
    try{
      const r=await fetch(`/api/user/ban-status?userId=${UID}&username=${encodeURIComponent(TGU.username||'')}`);
      const d=await r.json();
      if(d.ok&&d.banned&&!document.getElementById('ban-screen')) showBanScreen(d.banUntil);
    }catch{}
  },30000);

  // Проверка сброса каждые 15 сек (пока аппка открыта)
  setInterval(async()=>{
    try{
      const r=await fetch('/api/user/sync',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'',balance:S.balance,starsBalance:S.starsBalance,vipExpiry:S.vipExpiry||null})});
      const d=await r.json();
      if(d.ok&&d.reset){ hardReset(); return; }
      if(d.ok&&d.banned){ if(!document.getElementById('ban-screen')) showBanScreen(d.banUntil); return; }
      if(d.ok){
        S.balance=d.balance;
        if(d.starsBalance!==undefined) S.starsBalance=d.starsBalance;
        save(); syncB();
      }
    }catch{}
  },15000);
}

/* ══ SPLASH SCREEN ══ */
function _removeSplashAndSwipe() {
  const splash = document.getElementById('splash-screen');
  if (splash) { splash.style.display = 'none'; if (splash.parentNode) splash.parentNode.removeChild(splash); }
  const sw = document.getElementById('swipe-screen');
  if (sw) { sw.classList.remove('show'); sw.style.display = 'none'; }
}

(function() {
  // Spawn floating particles
  const container = document.getElementById('splash-particles');
  if (container) {
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'splash-particle';
      const size = 2 + Math.random() * 3;
      p.style.cssText = [
        'width:' + size + 'px',
        'height:' + size + 'px',
        'left:' + (15 + Math.random() * 70) + '%',
        'top:' + (30 + Math.random() * 40) + '%',
        'animation-duration:' + (2.5 + Math.random() * 2.5) + 's',
        'animation-delay:' + (Math.random() * 2) + 's',
        'opacity:0'
      ].join(';');
      container.appendChild(p);
    }
  }

  // Animate progress bar
  const bar = document.getElementById('splash-bar');
  const pct = document.getElementById('splash-pct');
  const steps = [
    { w: 18,  t: 'Инициализация...', delay: 350 },
    { w: 40,  t: 'Загрузка данных...', delay: 600 },
    { w: 65,  t: 'Подключение...', delay: 550 },
    { w: 85,  t: 'Почти готово...', delay: 500 },
    { w: 100, t: 'Готово!', delay: 400 },
  ];
  let i = 0;
  function nextStep() {
    if (i >= steps.length) return;
    const s = steps[i++];
    if (bar) bar.style.width = s.w + '%';
    if (pct) pct.textContent = s.t;
    setTimeout(nextStep, s.delay);
  }
  setTimeout(nextStep, 400);

  // Hide splash after ~3s → show swipe screen
  setTimeout(function() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('splash-hide');
      setTimeout(function() {
        splash.style.display = 'none';
        if (splash.parentNode) splash.parentNode.removeChild(splash);
        const sw = document.getElementById('swipe-screen');
        let swiped=false;try{swiped=!!localStorage.getItem('gb4_swiped');}catch(e){}
        if (sw && !swiped) {
          sw.classList.add('show');
          initSwipe();
          // После свайпа — запустим анимацию
          const _origDone = window._swipeDoneCallback;
          window._swipeDoneCallback = function() {
            if(_origDone) _origDone();
            setTimeout(function(){ if(typeof loadGlobalStats==='function') loadGlobalStats(); }, 200);
          };
        } else {
          if (sw) sw.style.display='none';
          // Если уже свайпали раньше — запускаем сразу
          setTimeout(function(){ if(typeof loadGlobalStats==='function') loadGlobalStats(); }, 200);
        }
      }, 550);
    }
  }, 3000);
})();

init();

/* ══ GLOBAL STATS + COUNT ANIMATION ══ */
function loadGlobalStats() {
  fetch('/api/global-stats')
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;
      _countUp('gs-users', d.users);
      _countUp('gs-earned', d.totalEarned);
    })
    .catch(() => {});
}

function _countUp(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!target) { el.textContent = '0'; return; }
  const duration = 800;
  const steps = 40;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const t = step / steps;
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(ease * target).toLocaleString('ru');
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = target.toLocaleString('ru');
    }
  }, duration / steps);
}
