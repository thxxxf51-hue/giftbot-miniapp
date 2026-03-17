/* ══ ADMIN PANEL ══ */
const ADMIN_UID = '6151671553';
let admTab = 'dashboard';
let admUsers = [], admTasks = [], admDraws = {active:[], finished:[]}, admPromos = [], admNotifs = [];

function admApi(path, method, body) {
  const sep = path.includes('?') ? '&' : '?';
  const url = method === 'GET' ? `/api/admin${path}${sep}userId=${UID}` : `/api/admin${path}`;
  const opts = { method: method||'GET', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify({ ...body, userId: UID });
  return fetch(url, opts).then(r => r.json());
}

/* ── Init admin ─────────────────────────────── */
function initAdmin() {
  if (UID !== ADMIN_UID) return;
  // Inject admin nav button
  const nav = document.getElementById('main-nav');
  if (nav && !document.getElementById('nb-admin')) {
    const btn = document.createElement('button');
    btn.className = 'nb';
    btn.id = 'nb-admin';
    btn.onclick = () => go('admin');
    btn.innerHTML = `<div class="nb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><div class="nb-red"></div></div><span class="nb-label">Админ</span>`;
    nav.appendChild(btn);
    if (!PAGES.includes('admin')) PAGES.push('admin');
    const page = document.getElementById('page-admin');
    if (page) page.style.display = 'none';
  }
}

/* ── Load admin section ─────────────────────── */
async function loadAdminSection(tab) {
  admTab = tab;
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.adm-section').forEach(s => s.classList.toggle('active', s.id === 'adm-' + tab));
  if (tab === 'dashboard') await loadAdmDashboard();
  else if (tab === 'users') await loadAdmUsers();
  else if (tab === 'tasks') await loadAdmTasks();
  else if (tab === 'draws') await loadAdmDraws();
  else if (tab === 'promos') await loadAdmPromos();
  else if (tab === 'notifs') await loadAdmNotifs();
}

/* ── DASHBOARD ───────────────────────────────── */
async function loadAdmDashboard() {
  const el = document.getElementById('adm-dashboard');
  el.innerHTML = `<div style="opacity:.4;text-align:center;padding:20px;font-size:12px">Загружаем...</div>`;
  const d = await admApi('/stats', 'GET');
  const icons = { users:'👥', draws:'🎁', tasks:'🎯', promos:'🎟', notifications:'📢' };
  const labels = { users:'Пользователи', draws:'Розыгрыши', tasks:'Задания', promos:'Промокоды', notifications:'Уведомления' };
  let statsHtml = '<div class="adm-stats">';
  for (const key of ['users','draws','tasks','promos','notifications']) {
    statsHtml += `<div class="adm-stat"><div class="adm-stat-icon">${icons[key]}</div><div class="adm-stat-val">${d[key]||0}</div><div class="adm-stat-label">${labels[key]}</div></div>`;
  }
  statsHtml += '</div>';

  let topHtml = '';
  if (d.topUsers && d.topUsers.length) {
    topHtml = `<div class="adm-card"><div class="adm-card-hdr"><div class="adm-card-title">🏆 Топ по балансу</div></div>`;
    d.topUsers.forEach((u, i) => {
      topHtml += `<div class="adm-top-row"><div class="adm-top-rank">${['🥇','🥈','🥉','4','5'][i]||i+1}</div><div class="adm-top-name">${u.username?'@'+u.username:u.firstName||'?'}</div><div class="adm-top-bal">${(u.balance||0).toLocaleString('ru')} 🪙</div></div>`;
    });
    topHtml += '</div>';
  }

  const backupHtml = `<div class="adm-backup-row"><div class="adm-backup-info"><div class="adm-backup-title">☁️ Бэкап базы данных</div><div class="adm-backup-sub">Сохранить db.json на GitHub (ветка db-backup)</div></div><button class="adm-btn adm-btn-sm adm-btn-blue" onclick="admBackupNow(this)">Бэкап</button></div>`;

  el.innerHTML = statsHtml + topHtml + backupHtml;
}

async function admBackupNow(btn) {
  const orig = btn.textContent;
  btn.textContent = '...';
  btn.disabled = true;
  const r = await admApi('/backup', 'POST', {});
  btn.textContent = r.ok ? '✅ Готово' : '❌ Ошибка';
  btn.disabled = false;
  setTimeout(() => { btn.textContent = orig; }, 3000);
}

/* ── USERS ───────────────────────────────────── */
async function loadAdmUsers() {
  const el = document.getElementById('adm-users');
  el.innerHTML = `<div class="adm-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input id="adm-user-search" placeholder="Поиск по юзернейму..." oninput="admFilterUsers()" autocomplete="off"></div><div id="adm-user-list"><div style="opacity:.4;text-align:center;padding:20px;font-size:12px">Загружаем...</div></div>`;
  admUsers = await admApi('/users', 'GET');
  admRenderUsers(admUsers);
}

function admFilterUsers() {
  const q = document.getElementById('adm-user-search')?.value.toLowerCase()||'';
  const filtered = q ? admUsers.filter(u => (u.username||'').toLowerCase().includes(q) || (u.firstName||'').toLowerCase().includes(q)) : admUsers;
  admRenderUsers(filtered);
}

function admRenderUsers(list) {
  const el = document.getElementById('adm-user-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = `<div style="opacity:.4;text-align:center;padding:20px;font-size:12px">Пусто</div>`; return; }
  el.innerHTML = list.slice(0, 50).map(u => {
    const initials = (u.firstName||u.username||'?')[0].toUpperCase();
    const name = u.username ? '@'+u.username : (u.firstName||'—');
    const sub = `${(u.balance||0).toLocaleString('ru')} 🪙 · ${u.refs||0} реф. · ${u.regDate||''}${u.banned?' · 🚫 Забанен':''}`;
    return `<div class="adm-user-item"><div class="adm-user-avatar">${initials}</div><div class="adm-user-info"><div class="adm-user-name">${name}${u.firstName&&u.username?' ('+u.firstName+')':''}</div><div class="adm-user-sub">${sub}</div></div><div style="display:flex;flex-direction:column;gap:4px"><button class="adm-btn adm-btn-sm adm-btn-green" onclick="admOpenBalance('${u.username||u.uid}', 'add')">+</button><button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admOpenBalance('${u.username||u.uid}', 'remove')">−</button></div></div>`;
  }).join('');
}

function admOpenBalance(username, action) {
  const label = action === 'add' ? '➕ Начислить монеты' : '➖ Снять монеты';
  const color = action === 'add' ? 'adm-btn-green' : 'adm-btn-danger';
  openGenMo(label, `Пользователь: @${username}`, action === 'add' ? '💰 Начислить' : '💸 Снять', async () => {
    const inp = document.getElementById('gm-extra-input');
    const amount = inp ? parseInt(inp.value) : 0;
    if (!amount || amount <= 0) { toast('Введи сумму', 'r'); return; }
    document.getElementById('gm-a').textContent = 'Ждём...';
    document.getElementById('gm-a').disabled = true;
    const r = await admApi('/balance', 'POST', { targetUsername: username, amount, action });
    closeGenMo();
    if (r.ok) {
      toast(`${action === 'add' ? '+' : '-'}${amount} монет @${username} ✅`, 'g');
      setTimeout(() => loadAdmUsers(), 500);
    } else {
      toast(r.error || 'Ошибка', 'r');
    }
  });
  // Inject input into modal
  setTimeout(() => {
    const body = document.getElementById('gm-body');
    if (body) {
      const inp = document.createElement('input');
      inp.id = 'gm-extra-input';
      inp.className = 'adm-input';
      inp.type = 'number';
      inp.placeholder = 'Сумма монет';
      inp.style.marginTop = '12px';
      body.appendChild(inp);
      inp.focus();
    }
  }, 50);
}

/* ── TASKS ───────────────────────────────────── */
async function loadAdmTasks() {
  const el = document.getElementById('adm-tasks');
  admTasks = await admApi('/tasks', 'GET');
  const taskTypeOptions = `
    <option value="sub:">sub: (подписка на канал) — укажи sub:USERNAME</option>
    <option value="chat:">chat: (написать в чат) — укажи chat:USERNAME</option>
    <option value="ref">ref (пригласить друга)</option>
    <option value="case">case (открыть кейс)</option>
    <option value="wallet">wallet (подключить кошелёк)</option>`;
  let listHtml = '';
  if (admTasks.length) {
    listHtml = '<div class="adm-sec-hdr"><div class="adm-sec-label">Созданные задания ('+admTasks.length+')</div></div>';
    listHtml += admTasks.map(t => `
      <div class="adm-item">
        <div class="adm-item-icon">🎯</div>
        <div class="adm-item-body">
          <div class="adm-item-name">${t.name}</div>
          <div class="adm-item-sub">${t.rew} 🪙 · #${t.id} · ${t.tag}</div>
        </div>
        <div class="adm-item-actions">
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteTask(${t.id})">🗑</button>
        </div>
      </div>`).join('');
  } else {
    listHtml = `<div style="opacity:.4;text-align:center;padding:10px 0;font-size:12px;margin-bottom:14px">Нет созданных заданий</div>`;
  }

  el.innerHTML = `
    ${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">➕ Создать задание</div></div>
      <div class="adm-form">
        <div class="adm-input-group"><div class="adm-label">Тип</div><input class="adm-input" id="atask-type" placeholder="sub:channel / chat:channel / ref / case / wallet"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">Название</div><input class="adm-input" id="atask-name" placeholder="Подписаться на канал"></div>
          <div class="adm-input-group"><div class="adm-label">Монеты</div><input class="adm-input" id="atask-rew" type="number" placeholder="500"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">Описание</div><input class="adm-input" id="atask-desc" placeholder="Подпишись на @channel"></div>
        <div class="adm-check-row"><div class="adm-check-label">Пометка NEW</div><button class="adm-toggle" id="atask-new-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateTask()">Создать задание</button>
      </div>
    </div>`;
}

async function admCreateTask() {
  const type = document.getElementById('atask-type')?.value.trim();
  const name = document.getElementById('atask-name')?.value.trim();
  const rew = parseInt(document.getElementById('atask-rew')?.value||'0');
  const desc = document.getElementById('atask-desc')?.value.trim();
  const isNew = document.getElementById('atask-new-toggle')?.classList.contains('on');
  if (!type || !name || !rew) { toast('Заполни все поля', 'r'); return; }
  const r = await admApi('/tasks', 'POST', { type, reward: rew, name, desc: desc||name, isNew });
  if (r.ok) { toast(`✅ Задание создано #${r.task.id}`, 'g'); loadAdmTasks(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteTask(id) {
  const r = await admApi('/tasks/'+id, 'DELETE', {});
  if (r.ok) { toast('🗑 Задание удалено', 'g'); loadAdmTasks(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ── DRAWS ───────────────────────────────────── */
async function loadAdmDraws() {
  const el = document.getElementById('adm-draws');
  admDraws = await admApi('/draws', 'GET');
  const active = admDraws.active || [];
  let listHtml = '';
  if (active.length) {
    listHtml = '<div class="adm-sec-hdr"><div class="adm-sec-label">Активные ('+active.length+')</div></div>';
    listHtml += active.map(d => {
      const left = Math.max(0, d.endsAt - Date.now());
      const leftStr = left > 86400000 ? Math.ceil(left/86400000)+'д' : left > 3600000 ? Math.ceil(left/3600000)+'ч' : Math.ceil(left/60000)+'мин';
      return `<div class="adm-item">
        <div class="adm-item-icon">${d.imageUrl?'🖼':'🎁'}</div>
        <div class="adm-item-body">
          <div class="adm-item-name">${d.prize}${/^\d+$/.test(String(d.prize))?' монет':''} · #${d.id}</div>
          <div class="adm-item-sub">⏱ ${leftStr} · 👥 ${(d.participants||[]).length} · 👑 ${d.winnersCount||1}</div>
        </div>
        <div class="adm-item-actions">
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteDraw(${d.id})">🗑</button>
        </div>
      </div>`;
    }).join('');
  } else {
    listHtml = `<div style="opacity:.4;text-align:center;padding:10px 0;font-size:12px;margin-bottom:14px">Нет активных розыгрышей</div>`;
  }

  el.innerHTML = `
    ${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">🎁 Создать розыгрыш</div></div>
      <div class="adm-form">
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">Приз</div><input class="adm-input" id="adraw-prize" placeholder="1000 или iPhone"></div>
          <div class="adm-input-group"><div class="adm-label">Победителей</div><input class="adm-input" id="adraw-winners" type="number" placeholder="1" value="1"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">Длительность</div>
          <select class="adm-select" id="adraw-time">
            <option value="600000">10 минут</option>
            <option value="1800000">30 минут</option>
            <option value="3600000" selected>1 час</option>
            <option value="7200000">2 часа</option>
            <option value="86400000">1 день</option>
            <option value="172800000">2 дня</option>
            <option value="604800000">7 дней</option>
          </select>
        </div>
        <div class="adm-input-group"><div class="adm-label">Ссылка на картинку (необязательно)</div><input class="adm-input" id="adraw-img" placeholder="https://..."></div>
        <div class="adm-input-group"><div class="adm-label">Описание (необязательно)</div><input class="adm-input" id="adraw-desc" placeholder="Описание розыгрыша"></div>
        <div class="adm-input-group"><div class="adm-label">Условие — Telegram канал (необязательно)</div><input class="adm-input" id="adraw-cond-chan" placeholder="@channel"></div>
        <div class="adm-check-row"><div class="adm-check-label">Требует билет</div><button class="adm-toggle" id="adraw-ticket-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateDraw()">Создать розыгрыш</button>
      </div>
    </div>`;
}

async function admCreateDraw() {
  const prize = document.getElementById('adraw-prize')?.value.trim();
  const timeMs = parseInt(document.getElementById('adraw-time')?.value||'3600000');
  const winnersCount = parseInt(document.getElementById('adraw-winners')?.value||'1');
  const imageUrl = document.getElementById('adraw-img')?.value.trim();
  const desc = document.getElementById('adraw-desc')?.value.trim();
  const chanCond = document.getElementById('adraw-cond-chan')?.value.trim();
  const requireTicket = document.getElementById('adraw-ticket-toggle')?.classList.contains('on');
  if (!prize) { toast('Укажи приз', 'r'); return; }
  const r = await admApi('/draws', 'POST', { prize, timeMs, winnersCount, requireTicket, imageUrl: imageUrl||null });
  if (r.ok) {
    const id = r.id;
    if (desc) await admApi(`/draws/${id}/desc`, 'PATCH', { desc });
    if (chanCond) await admApi(`/draws/${id}/conditions`, 'POST', { type:'tg', channel: chanCond.replace('@',''), name: chanCond });
    toast(`✅ Розыгрыш #${id} создан`, 'g');
    loadAdmDraws();
  } else toast(r.error||'Ошибка', 'r');
}

async function admDeleteDraw(id) {
  const r = await admApi('/draws/'+id, 'DELETE', {});
  if (r.ok) { toast('🗑 Розыгрыш удалён', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ── PROMOS ──────────────────────────────────── */
async function loadAdmPromos() {
  const el = document.getElementById('adm-promos');
  admPromos = await admApi('/promos', 'GET');
  let listHtml = '';
  if (admPromos.length) {
    listHtml = '<div class="adm-sec-hdr"><div class="adm-sec-label">Активные промокоды ('+admPromos.length+')</div></div>';
    listHtml += admPromos.map(p => `
      <div class="adm-item">
        <div class="adm-item-icon">${p.vipOnly?'👑':'🎟'}</div>
        <div class="adm-item-body">
          <div class="adm-item-name">${p.code}</div>
          <div class="adm-item-sub">${p.reward} 🪙 · ${p.usedCount}/${p.maxUses} активаций${p.vipOnly?' · VIP':''}</div>
        </div>
        <div class="adm-item-actions">
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeletePromo('${p.code}')">🗑</button>
        </div>
      </div>`).join('');
  } else {
    listHtml = `<div style="opacity:.4;text-align:center;padding:10px 0;font-size:12px;margin-bottom:14px">Нет промокодов</div>`;
  }

  el.innerHTML = `
    ${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">🎟 Создать промокод</div></div>
      <div class="adm-form">
        <div class="adm-input-group"><div class="adm-label">Код</div><input class="adm-input" id="apromo-code" placeholder="SUMMER500" autocapitalize="characters" style="text-transform:uppercase"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">Монеты</div><input class="adm-input" id="apromo-rew" type="number" placeholder="500"></div>
          <div class="adm-input-group"><div class="adm-label">Активаций</div><input class="adm-input" id="apromo-uses" type="number" placeholder="100"></div>
        </div>
        <div class="adm-check-row"><div class="adm-check-label">Только для VIP</div><button class="adm-toggle" id="apromo-vip-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreatePromo()">Создать промокод</button>
      </div>
    </div>`;
}

async function admCreatePromo() {
  const code = document.getElementById('apromo-code')?.value.trim().toUpperCase();
  const reward = parseInt(document.getElementById('apromo-rew')?.value||'0');
  const maxUses = parseInt(document.getElementById('apromo-uses')?.value||'0');
  const vipOnly = document.getElementById('apromo-vip-toggle')?.classList.contains('on');
  if (!code || !reward || !maxUses) { toast('Заполни все поля', 'r'); return; }
  const r = await admApi('/promos', 'POST', { code, reward, maxUses, vipOnly });
  if (r.ok) { toast(`✅ Промокод ${r.code} создан`, 'g'); loadAdmPromos(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeletePromo(code) {
  const r = await admApi(`/promos/${encodeURIComponent(code)}`, 'DELETE', {});
  if (r.ok) { toast(`🗑 Промокод ${code} удалён`, 'g'); loadAdmPromos(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ── NOTIFICATIONS ───────────────────────────── */
async function loadAdmNotifs() {
  const el = document.getElementById('adm-notifs');
  admNotifs = await admApi('/notifications', 'GET');
  const typeEmoji = { promo:'🎁', win:'🏆', system:'🔔', alert:'⚠️' };
  let listHtml = '';
  if (admNotifs.length) {
    listHtml = '<div class="adm-sec-hdr"><div class="adm-sec-label">Активные ('+admNotifs.length+')</div><button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admClearNotifs()" style="font-size:10px">Очистить все</button></div>';
    listHtml += admNotifs.slice(0, 20).map(n => `
      <div class="adm-item">
        <div class="adm-item-icon">${typeEmoji[n.type]||'🔔'}</div>
        <div class="adm-item-body">
          <div class="adm-item-name" style="white-space:normal;line-height:1.3">${n.text}</div>
          <div class="adm-item-sub">${n.type} · ${new Date(n.ts).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="adm-item-actions">
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteNotif(${n.id})">🗑</button>
        </div>
      </div>`).join('');
  } else {
    listHtml = `<div style="opacity:.4;text-align:center;padding:10px 0;font-size:12px;margin-bottom:14px">Нет уведомлений</div>`;
  }

  el.innerHTML = `
    ${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">📢 Отправить уведомление</div></div>
      <div class="adm-form">
        <div class="adm-input-group">
          <div class="adm-label">Тип</div>
          <div class="adm-notif-type">
            <button class="adm-notif-type-btn sel" data-type="system" onclick="admSelectNotifType(this)">🔔 Система</button>
            <button class="adm-notif-type-btn" data-type="promo" onclick="admSelectNotifType(this)">🎁 Промо</button>
            <button class="adm-notif-type-btn" data-type="win" onclick="admSelectNotifType(this)">🏆 Победа</button>
            <button class="adm-notif-type-btn" data-type="alert" onclick="admSelectNotifType(this)">⚠️ Важно</button>
          </div>
        </div>
        <div class="adm-input-group"><div class="adm-label">Текст уведомления</div><textarea class="adm-textarea" id="anotif-text" placeholder="Текст уведомления для всех пользователей..."></textarea></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateNotif()">📢 Отправить уведомление</button>
        <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:12px">
          <div class="adm-label" style="margin-bottom:8px">📱 Telegram рассылка</div>
          <textarea class="adm-textarea" id="abroadcast-text" placeholder="Текст рассылки в Telegram всем пользователям..." style="min-height:60px"></textarea>
          <button class="adm-btn" style="background:rgba(0,255,163,.15);color:#00FFA3;border:1px solid rgba(0,255,163,.3);width:100%;margin-top:8px;border-radius:10px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;" onclick="admBroadcast()">📤 Разослать в Telegram</button>
        </div>
      </div>
    </div>`;
}

function admSelectNotifType(btn) {
  document.querySelectorAll('.adm-notif-type-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}

async function admCreateNotif() {
  const text = document.getElementById('anotif-text')?.value.trim();
  const type = document.querySelector('.adm-notif-type-btn.sel')?.dataset.type || 'system';
  if (!text) { toast('Введи текст', 'r'); return; }
  const r = await admApi('/notifications', 'POST', { type, text });
  if (r.ok) { toast('✅ Уведомление отправлено', 'g'); loadAdmNotifs(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteNotif(id) {
  const r = await admApi(`/notifications/${id}`, 'DELETE', {});
  if (r.ok) { toast('🗑 Удалено', 'g'); loadAdmNotifs(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admClearNotifs() {
  for (const n of admNotifs) await admApi(`/notifications/${n.id}`, 'DELETE', {});
  toast('🗑 Все уведомления удалены', 'g');
  loadAdmNotifs();
}

async function admBroadcast() {
  const text = document.getElementById('abroadcast-text')?.value.trim();
  if (!text) { toast('Введи текст', 'r'); return; }
  const btn = document.querySelector('[onclick="admBroadcast()"]');
  if (btn) { btn.textContent = '⏳ Рассылка...'; btn.disabled = true; }
  const r = await admApi('/broadcast', 'POST', { text });
  if (btn) { btn.disabled = false; btn.textContent = '📤 Разослать в Telegram'; }
  if (r.ok) toast(`✅ Отправлено: ${r.sent}, ошибок: ${r.failed}`, 'g');
  else toast(r.error||'Ошибка', 'r');
}
