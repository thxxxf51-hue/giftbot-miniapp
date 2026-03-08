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
  // Удаляем только ключ этого пользователя, не трогаем остальных
  try { localStorage.removeItem('gb4_' + UID); } catch {}
  // Перезагружаем страницу — приложение запустится с чистым slate
  location.reload();
}

/* ══ INIT ══ */
async function init(){
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
  document.getElementById('p-un').textContent=uname;
  document.getElementById('p-reg').textContent=S.regDate;
  document.getElementById('p-refs').textContent=S.refs.length;
  document.getElementById('ref-link').textContent=`https://t.me/SATapp_bot?start=ref_${UID}`;
  applyNick(S.nickColor);
  applyCrown();
  applyLegend();
  updateVipUI();
  updateEffectUI();
  syncB();
  renderTasks();
  rShopItems();
  rCases();
  rRefStats();
  rRefList();
  initRefTaskSwiper();
  document.getElementById('pi-h').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-h');});
  document.getElementById('pi-p').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-p');});

  try{
    const sr=await fetch('/api/user/sync',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'',balance:S.balance,starsBalance:S.starsBalance,vipExpiry:S.vipExpiry||null,photoUrl:TGU.photo_url||null,localRefs:S.refs,localRefEarned:S.refEarned,localTask3Done:S.task3refsDone||false,localTask5Done:S.task5refsDone||false})});
    const sd=await sr.json();
    if(sd.ok){
      // Бан
      if(sd.banned){ showBanScreen(sd.banUntil); return; }

      // Сброс статистики — очищаем localStorage и перезагружаемся
      if(sd.reset){
        hardReset();
        return;
      }

      S.balance=sd.balance;
      if(sd.starsBalance!==undefined)S.starsBalance=sd.starsBalance;
      // Применяем рефералов с сервера — не затираем локальные если сервер вернул пустые
      if(sd.refs!==undefined){
        if(sd.refs.length > 0 || S.refs.length === 0) S.refs=sd.refs;
        // Если сервер вернул пустые но task3Done=true — восстанавливаем refEarned из локальных
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
  setInterval(loadDraws,30000);

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
}

init();
