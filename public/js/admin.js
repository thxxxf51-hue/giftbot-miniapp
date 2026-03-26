/* ══ ADMIN PANEL ══ */
const ADMIN_UID = '6151671553';
let admCurrentSection = 'dashboard';
let admUsers = [], admTasks = [], admDraws = {active:[], finished:[]}, admPromos = [], admNotifs = [], admShopItems = [];
let admStatsCache = null;

/* ── SVG icons ── */
const AICO = {
  users:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  tasks:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  draws:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  promos:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  notifs:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  shop:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  coin:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  plus:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  backup:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 16 20 20 4 20 4 16"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="4" x2="12" y2="16"/></svg>`,
  send:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  broadcast: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 11.22a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 2.55h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  search:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  star:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  crown:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><line x1="5" y1="20" x2="19" y2="20"/></svg>`,
  check:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  bell:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  timer:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  img:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  upload:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  ticket:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
  desc:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  users2:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  ban:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  shield:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  gift:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  color:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
};

function admApi(path, method, body) {
  const m = method || 'GET';
  const sep = path.includes('?') ? '&' : '?';
  const base = window.location.origin;
  const url = `${base}/api/admin${path}${sep}userId=${UID}`;
  const opts = { method: m, headers: {} };
  if (m !== 'GET' && m !== 'HEAD') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(Object.assign({}, body || {}, { userId: UID }));
  }
  return fetch(url, opts)
    .then(async r => {
      const text = await r.text();
      try { return JSON.parse(text); }
      catch { return { error: text || ('HTTP ' + r.status) }; }
    })
    .catch(e => ({ error: String(e.message || e) }));
}

function fmtDur(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 'с';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'мин ' + (s % 60) + 'с';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'ч ' + (m % 60) + 'мин';
  return Math.floor(h / 24) + 'д ' + (h % 24) + 'ч';
}

function fmtSoldOut(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + ' сек.';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' мин. ' + (s % 60) + ' сек. (' + s + 'с)';
  const h = Math.floor(m / 60);
  return h + ' ч. ' + (m % 60) + ' мин. (' + s + 'с)';
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ── Init admin ─────────────────────────────── */
function initAdmin() {
  if (UID !== ADMIN_UID) return;
  const profileEntry = document.getElementById('profile-admin-entry');
  if (profileEntry) profileEntry.style.display = 'block';
  if (!PAGES.includes('admin')) PAGES.push('admin');
  admApi('/stats', 'GET').then(d => { if (!d.error) admStatsCache = d; }).catch(() => {});
}

/* ── Navigation ─────────────────────────────── */
function admGoSection(section) {
  admCurrentSection = section;
  // Прячем все секции
  document.querySelectorAll('.adm-section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  // Заголовок и кнопка назад
  const titles = {
    dashboard: 'Админ панель',
    users: 'Пользователи',
    tasks: 'Задания',
    shop: 'Магазин',
    draws: 'Розыгрыши',
    promos: 'Промокоды',
    notifs: 'Рассылка',
    access: 'Доступ',
  };
  const titleEl = document.getElementById('adm-page-title');
  if (titleEl) titleEl.textContent = titles[section] || 'Админ панель';

  const backBtn = document.getElementById('adm-back-btn');
  const coinsPill = document.getElementById('adm-coins-pill');
  if (backBtn) backBtn.style.display = section === 'dashboard' ? 'none' : 'flex';
  if (coinsPill) coinsPill.style.display = section === 'dashboard' ? 'flex' : 'none';

  // Создаём секцию если нет в HTML
  if (!document.getElementById('adm-' + section)) {
    const wrapper = document.getElementById('adm-content-wrapper') || document.getElementById('adm-content') || document.body;
    const div = document.createElement('div');
    div.id = 'adm-' + section;
    div.className = 'adm-section';
    div.style.display = 'none';
    wrapper.appendChild(div);
  }
  const el = document.getElementById('adm-' + section);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }

  // Загружаем контент
  if (section === 'dashboard') loadAdmDashboard();
  else if (section === 'users')  loadAdmUsers();
  else if (section === 'tasks')  loadAdmTasks();
  else if (section === 'shop')   loadAdmShop();
  else if (section === 'draws')  loadAdmDraws();
  else if (section === 'promos') loadAdmPromos();
  else if (section === 'notifs') loadAdmNotifs();
  else if (section === 'access') loadAdmAccess();
}

function loadAdminSection() {
  admGoSection('dashboard');
}

function admLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="adm-loading"><div class="adm-spin"></div>Загружаем...</div>`;
}

/* ════════════════════════════════════════════
   DASHBOARD — сетка карточек
════════════════════════════════════════════ */
function _renderAdmDashboard(d) {
  const coinsEl = document.getElementById('adm-total-coins');
  if (coinsEl) coinsEl.textContent = (d.totalCoins||0).toLocaleString('ru');

  const cards = [
    { id: 'users',  icon: AICO.users,  count: d.users||0,               label: 'Пользователи',    color: '#4fc3f7' },
    { id: 'coins',  icon: AICO.coin,   count: (d.totalCoins||0).toLocaleString('ru'), label: 'Монет в обороте', color: '#ffd54f', noSection: true },
    { id: 'tasks',  icon: AICO.tasks,  count: d.tasks||0,               label: 'Задания',          color: '#81c784' },
    { id: 'shop',   icon: AICO.shop,   count: d.shop||0,                label: 'Магазин',          color: '#ce93d8' },
    { id: 'draws',  icon: AICO.draws,  count: d.draws||0,               label: 'Розыгрыши',        color: '#ff8a65' },
    { id: 'promos', icon: AICO.promos, count: d.promos||0,              label: 'Промокоды',        color: '#4db6ac' },
    { id: 'notifs', icon: AICO.notifs, count: d.notifications||0,       label: 'Рассылка',         color: '#f48fb1' },
    { id: 'access', icon: AICO.star,   count: '🔒',                     label: 'Доступ',            color: '#e57373' },
  ];

  let html = `<div class="adm-grid">`;
  for (const c of cards) {
    const click = c.noSection ? '' : `onclick="admGoSection('${c.id}')"`;
    const cursor = c.noSection ? 'cursor:default' : 'cursor:pointer';
    html += `<div class="adm-grid-card" ${click} style="${cursor}">
      <div class="adm-gc-count" style="color:${c.color}">${c.count}</div>
      <div class="adm-gc-icon" style="color:${c.color}">${c.icon}</div>
      <div class="adm-gc-label">${c.label}</div>
    </div>`;
  }
  html += `</div>`;

  if (d.topUsers && d.topUsers.length) {
    html += `<div class="adm-card" style="margin-top:14px">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.crown} Топ по балансу</div></div>`;
    d.topUsers.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)+'.';
      html += `<div class="adm-top-row">
        <div class="adm-top-rank">${medal}</div>
        <div class="adm-top-name">${u.username?'@'+u.username:u.firstName||'?'}</div>
        <div class="adm-top-bal">${(u.balance||0).toLocaleString('ru')} ${AICO.coin}</div>
      </div>`;
    });
    html += `</div>`;
  }

  html += `<div class="adm-backup-row">
    <div class="adm-backup-info">
      <div class="adm-backup-title">${AICO.backup} Бэкап базы данных</div>
      <div class="adm-backup-sub">Сохранить db.json на GitHub</div>
    </div>
    <button class="adm-btn adm-btn-sm adm-btn-blue" onclick="admBackupNow(this)">${AICO.backup} Бэкап</button>
  </div>`;

  document.getElementById('adm-dashboard').innerHTML = html;
}

async function loadAdmDashboard() {
  if (admStatsCache) {
    _renderAdmDashboard(admStatsCache);
  } else {
    admLoading('adm-dashboard');
  }
  const d = await admApi('/stats', 'GET');
  if (d.error) {
    if (!admStatsCache) {
      document.getElementById('adm-dashboard').innerHTML = `<div class="adm-err"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${d.error}</div>`;
    }
    return;
  }
  admStatsCache = d;
  _renderAdmDashboard(d);
}

async function admBackupNow(btn) {
  btn.disabled = true;
  btn.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px"></div>`;
  const r = await admApi('/backup', 'POST', {});
  btn.disabled = false;
  btn.innerHTML = r.ok ? `${AICO.check} Готово` : `${AICO.alert} Ошибка`;
  setTimeout(() => { btn.innerHTML = `${AICO.backup} Бэкап`; }, 3000);
}

/* ════════════════════════════════════════════
   USERS
════════════════════════════════════════════ */
async function loadAdmUsers() {
  document.getElementById('adm-users').innerHTML = `
    <div class="adm-search">${AICO.search}<input id="adm-user-search" placeholder="Поиск по юзернейму или имени..." oninput="admFilterUsers()" autocomplete="off"></div>
    <div id="adm-user-list"><div class="adm-loading"><div class="adm-spin"></div>Загружаем...</div></div>`;
  const data = await admApi('/users', 'GET');
  if (data.error) {
    document.getElementById('adm-user-list').innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`;
    return;
  }
  admUsers = data;
  admRenderUsers(admUsers);
}

function admFilterUsers() {
  const q = (document.getElementById('adm-user-search')?.value || '').toLowerCase();
  admRenderUsers(q ? admUsers.filter(u => (u.username||'').toLowerCase().includes(q) || (u.firstName||'').toLowerCase().includes(q)) : admUsers);
}

function admRenderUsers(list) {
  const el = document.getElementById('adm-user-list');
  if (!el) return;
  if (!list || !list.length) { el.innerHTML = `<div class="adm-empty">${AICO.users} Пусто</div>`; return; }
  el.innerHTML = list.map(u => {
    const initials = (u.firstName || u.username || '?')[0].toUpperCase();
    const name = u.username ? '@'+u.username : (u.firstName||'—');
    const sub = `${(u.balance||0).toLocaleString('ru')} монет · ${u.refs||0} реф.${u.banned?' · 🚫 Бан':''}`;
    const avatarHtml = u.photoUrl
      ? `<div class="adm-user-avatar" style="background:none;padding:0;overflow:hidden"><img src="${u.photoUrl}" alt="${initials}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='${initials}'"></div>`
      : `<div class="adm-user-avatar">${initials}</div>`;
    return `<div class="adm-user-item" onclick="admViewUser('${u.uid}')" style="cursor:pointer">
      ${avatarHtml}
      <div class="adm-user-info">
        <div class="adm-user-name">${name}${u.firstName&&u.username?' ('+u.firstName+')':''}</div>
        <div class="adm-user-sub">${sub}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px" onclick="event.stopPropagation()">
        <button class="adm-btn adm-btn-sm adm-btn-green" onclick="admOpenBalance('${u.username||u.uid}','add')" title="Начислить">${AICO.plus}</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admOpenBalance('${u.username||u.uid}','remove')" title="Снять">&minus;</button>
      </div>
    </div>`;
  }).join('');
}

async function admViewUser(uid) {
  const mo = document.getElementById('adm-user-mo');
  const body = document.getElementById('adm-user-mo-body');
  if (!mo || !body) return;
  body.innerHTML = `<div class="adm-loading"><div class="adm-spin"></div>Загружаем...</div>`;
  mo.style.display = 'flex';
  const d = await admApi(`/users/${uid}`, 'GET');
  if (d.error) { body.innerHTML = `<div class="adm-err">${AICO.alert} ${d.error}</div>`; return; }

  const name = d.username ? '@'+d.username : (d.firstName||'—');
  const fullName = d.firstName ? d.firstName + (d.username ? ' (@'+d.username+')' : '') : (d.username ? '@'+d.username : '—');
  const vipStr = d.vipActive ? `✅ до ${fmtDate(d.vipExpiry)}` : '—';
  const invItems = Object.entries(d.inventory||{}).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${v}`).join(', ') || '—';
  const txHtml = (d.transactions||[]).length
    ? (d.transactions||[]).map(t=>`<div class="adm-up-row"><span style="opacity:.5">${t.date}</span><span>${t.details||t.type}</span><span style="color:${String(t.amount).startsWith('+')?'#00FFA3':'#ff6b6b'};font-weight:700">${t.amount}</span></div>`).join('')
    : '<div style="opacity:.4;font-size:11px">Транзакций нет</div>';

  const isBanned = d.banned;
  const banTarget = d.username || d.uid;

  body.innerHTML = `
    <div class="adm-up-avatar">${(d.firstName||d.username||'?')[0].toUpperCase()}</div>
    <div class="adm-up-name">${fullName}</div>
    <div class="adm-up-uid">ID: ${d.uid}${isBanned?' · <span style="color:#ff6b6b">🚫 Забанен</span>':''}</div>
    <div class="adm-up-grid">
      <div class="adm-up-cell"><div class="adm-up-cell-label">💰 Монеты</div><div class="adm-up-cell-val">${(d.balance||0).toLocaleString('ru')}</div></div>
      <div class="adm-up-cell"><div class="adm-up-cell-label">⭐ Звёзды</div><div class="adm-up-cell-val">${d.starsBalance||0}</div></div>
      <div class="adm-up-cell"><div class="adm-up-cell-label">👥 Рефералы</div><div class="adm-up-cell-val">${d.refs||0}</div></div>
      <div class="adm-up-cell"><div class="adm-up-cell-label">🎁 Реф. заработок</div><div class="adm-up-cell-val">${(d.refEarned||0).toLocaleString('ru')}</div></div>
      <div class="adm-up-cell"><div class="adm-up-cell-label">✅ Задания</div><div class="adm-up-cell-val">${d.doneTasks||0}</div></div>
      <div class="adm-up-cell"><div class="adm-up-cell-label">🎫 Промокоды</div><div class="adm-up-cell-val">${d.usedPromos||0}</div></div>
    </div>
    <div class="adm-up-row"><span>👑 VIP</span><span>${vipStr}</span></div>
    <div class="adm-up-row"><span>💎 Корона</span><span>${d.hasCrown?'✅ Есть':'—'}</span></div>
    <div class="adm-up-row"><span>💼 Кошелёк</span><span style="font-size:9px;word-break:break-all">${d.walletAddress||'—'}</span></div>
    <div class="adm-up-row"><span>📦 Инвентарь</span><span style="font-size:10px">${invItems}</span></div>
    <div class="adm-up-row"><span>📅 Регистрация</span><span>${d.regDate||'—'}</span></div>
    <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:10px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);margin-bottom:8px">Последние транзакции</div>
      ${txHtml}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
      <button class="adm-btn adm-btn-green" onclick="admCloseUserMo();admOpenBalance('${banTarget}','add')">${AICO.plus} Начислить</button>
      <button class="adm-btn adm-btn-danger" onclick="admCloseUserMo();admOpenBalance('${banTarget}','remove')">&minus; Снять</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      ${isBanned
        ? `<button class="adm-btn adm-btn-blue" style="grid-column:1/-1" onclick="admUnbanUser('${banTarget}',this)">${AICO.shield} Разбанить</button>`
        : `<button class="adm-btn adm-btn-danger" onclick="admBanUser('${banTarget}','0',this)">${AICO.ban} Бан навсегда</button>
           <button class="adm-btn" style="background:rgba(255,150,0,.15);border:1px solid rgba(255,150,0,.25);color:#ff9632" onclick="admBanPicker('${banTarget}')">${AICO.timer} Бан на время</button>`
      }
    </div>`;
}

function admCloseUserMo() {
  const mo = document.getElementById('adm-user-mo');
  if (mo) mo.style.display = 'none';
}

async function admBanUser(target, duration, btn) {
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle"></div>`; }
  const r = await admApi('/ban', 'POST', { username: target, duration: Number(duration) });
  if (r.ok) {
    toast(`🚫 Забанен: ${target}`, 'r');
    admCloseUserMo();
    loadAdmUsers();
  } else {
    toast(r.error || 'Ошибка', 'r');
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
  }
}

async function admUnbanUser(target, btn) {
  const label = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle"></div> Снимаем...`; }
  const r = await admApi('/unban', 'POST', { username: target });
  if (r.ok) {
    toast(`✅ Разбанен: ${target}`, 'g');
    admCloseUserMo();
    loadAdmUsers();
  } else {
    toast(r.error || 'Ошибка', 'r');
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
  }
}

function admBanPicker(target) {
  const opts = [
    { label: '1 час',   ms: 3600000 },
    { label: '3 часа',  ms: 10800000 },
    { label: '12 часов',ms: 43200000 },
    { label: '1 день',  ms: 86400000 },
    { label: '3 дня',   ms: 259200000 },
    { label: '7 дней',  ms: 604800000 },
    { label: '30 дней', ms: 2592000000 },
  ];
  const body = document.getElementById('adm-user-mo-body');
  if (!body) return;
  body.innerHTML += `<div style="border-top:1px solid rgba(255,255,255,.08);margin-top:12px;padding-top:12px">
    <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:8px">${AICO.timer} Выберите срок бана:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${opts.map(o=>`<button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admBanUser('${target}','${o.ms}',this)">${o.label}</button>`).join('')}
    </div>
  </div>`;
}

function admOpenBalance(username, action) {
  openGenMo(action==='add'?'Начислить монеты':'Снять монеты', `Пользователь: @${username}`, action==='add'?'Начислить':'Снять', async () => {
    const inp = document.getElementById('gm-extra-input');
    const amount = inp ? parseInt(inp.value) : 0;
    if (!amount || amount <= 0) { toast('Введи сумму', 'r'); return; }
    document.getElementById('gm-a').textContent = 'Ждём...';
    document.getElementById('gm-a').disabled = true;
    const r = await admApi('/balance', 'POST', { targetUsername: username, amount, action });
    closeGenMo();
    if (r.ok) { toast(`${action==='add'?'+':'-'}${amount} монет @${username}`, 'g'); setTimeout(() => loadAdmUsers(), 600); }
    else toast(r.error||'Ошибка', 'r');
  });
  setTimeout(() => {
    const b = document.getElementById('gm-body');
    if (b && !document.getElementById('gm-extra-input')) {
      const inp = document.createElement('input');
      inp.id = 'gm-extra-input'; inp.className = 'adm-input';
      inp.type = 'number'; inp.placeholder = 'Сумма монет'; inp.style.marginTop = '12px';
      b.appendChild(inp); inp.focus();
    }
  }, 60);
}

/* ════════════════════════════════════════════
   TASKS
════════════════════════════════════════════ */
// Статические задания из config.js (дублируются для редактирования в админке)
const STATIC_TASKS = [
  {id:1, icoKey:'sub',    tag:'Подписка', tc:'g',  name:'Подписаться на канал',     desc:'Подпишись на @broketalking и включи уведомления! (В случае отписки с баланса будет списан штраф)',  rew:100},
  {id:4, icoKey:'ref',    tag:'Друзья',   tc:'fr', name:'Пригласить первого друга', desc:'Пригласи друга по своей реф-ссылке и получи монеты за каждого реферала!',                            rew:1000},
  {id:6, icoKey:'case',   tag:'Задание',  tc:'o',  name:'Открыть первый кейс',      desc:'Открой любой кейс в разделе Магазин → Кейсы и получи награду!',                                      rew:200},
  {id:7, icoKey:'wallet', tag:'Кошелёк',  tc:'b',  name:'Подключить TON кошелёк',   desc:'Подключи TonKeeper или Telegram Wallet в разделе Профиль и получи монеты!',                           rew:2000},
];

async function loadAdmTasks() {
  admLoading('adm-tasks');
  const [data, overridesData] = await Promise.all([
    admApi('/tasks', 'GET'),
    admApi('/tasks/overrides', 'GET'),
  ]);
  const el = document.getElementById('adm-tasks');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admTasks = data;
  const overrides = overridesData.error ? {} : (overridesData || {});

  // ── Статические задания ──
  const staticHtml = STATIC_TASKS.map(t => {
    const ov = overrides[t.id] || {};
    const rew = ov.rew !== undefined ? ov.rew : t.rew;
    const name = ov.name || t.name;
    const desc = ov.desc || t.desc;
    const tag = ov.tag || t.tag;
    const tc = ov.tc || t.tc;
    const hasOverride = Object.keys(ov).length > 0;
    return `
      <div class="adm-draw-card" id="adm-stask-${t.id}">
        <div class="adm-draw-header">
          <div class="adm-draw-info">
            <div class="adm-draw-prize">${name} ${hasOverride ? '<span style="font-size:10px;color:#f39c12;margin-left:4px">✏️ изм.</span>' : ''}</div>
            <div class="adm-draw-meta">${AICO.coin} ${rew} монет &nbsp;·&nbsp; тег: <b>${tag}</b> (${tc}) &nbsp;·&nbsp; #${t.id}</div>
          </div>
          <div class="adm-draw-btns">
            <button class="adm-btn adm-btn-sm" onclick="admToggleStaticTaskEdit(${t.id})">${AICO.edit}</button>
            ${hasOverride ? `<button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admResetStaticTask(${t.id})" title="Сбросить изменения">${AICO.trash}</button>` : ''}
          </div>
        </div>
        <div class="adm-draw-edit" id="adm-stask-edit-${t.id}" style="display:none">
          <div class="adm-form" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">
            <div class="adm-input-row">
              <div class="adm-input-group"><div class="adm-label">${AICO.desc} Название</div><input class="adm-input" id="stedit-name-${t.id}" value="${(name||'').replace(/"/g,'&quot;')}"></div>
              <div class="adm-input-group"><div class="adm-label">${AICO.coin} Монеты</div><input class="adm-input" id="stedit-rew-${t.id}" type="number" value="${rew}"></div>
            </div>
            <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="stedit-desc-${t.id}" value="${(desc||'').replace(/"/g,'&quot;')}"></div>
            <div class="adm-input-row">
              <div class="adm-input-group"><div class="adm-label">${AICO.color} Тег (текст)</div><input class="adm-input" id="stedit-tag-${t.id}" value="${tag||''}"></div>
              <div class="adm-input-group">
                <div class="adm-label">${AICO.color} Цвет тега</div>
                <select class="adm-select" id="stedit-tc-${t.id}">
                  <option value="g" ${tc==='g'?'selected':''}>🟢 Зелёный</option>
                  <option value="fr" ${tc==='fr'?'selected':''}>🔴 Красный</option>
                  <option value="o" ${tc==='o'?'selected':''}>🟠 Оранжевый</option>
                  <option value="b" ${tc==='b'?'selected':''}>🔵 Синий</option>
                </select>
              </div>
            </div>
            <button class="adm-btn adm-btn-primary" onclick="admSaveStaticTask(${t.id})">${AICO.check} Сохранить</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // ── Пользовательские задания ──
  let customHtml = '';
  if (admTasks.length) {
    customHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.tasks} Кастомные задания (${admTasks.length})</div></div>`;
    customHtml += admTasks.map(t => `
      <div class="adm-item" id="adm-ctask-wrap-${t.id}">
        <div class="adm-item-icon-svg">${AICO.tasks}</div>
        <div class="adm-item-body">
          <div class="adm-item-name">${t.name}${t.isNew?` <span style="font-size:9px;padding:2px 6px;border-radius:10px;background:${t.newTagColor||'rgba(80,160,255,.25)'};color:#5ab0ff;font-weight:700">NEW</span>`:''}</div>
          <div class="adm-item-sub">${t.rew} монет · #${t.id} · тег: ${t.tag||'—'}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="adm-btn adm-btn-sm" onclick="admToggleCustomTaskEdit(${t.id})" title="Редактировать">${AICO.edit}</button>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteTask(${t.id})">${AICO.trash}</button>
        </div>
      </div>
      <div id="adm-ctask-edit-${t.id}" style="display:none" class="adm-card" style="margin:4px 0 8px">
        <div class="adm-card-hdr"><div class="adm-card-title">${AICO.edit} Редактировать #${t.id}</div></div>
        <div class="adm-form">
          <div class="adm-input-row">
            <div class="adm-input-group"><div class="adm-label">Название</div><input class="adm-input" id="ctedit-name-${t.id}" value="${(t.name||'').replace(/"/g,'&quot;')}"></div>
            <div class="adm-input-group"><div class="adm-label">Монеты</div><input class="adm-input" id="ctedit-rew-${t.id}" type="number" value="${t.rew||0}"></div>
          </div>
          <div class="adm-input-group"><div class="adm-label">Описание</div><input class="adm-input" id="ctedit-desc-${t.id}" value="${(t.desc||'').replace(/"/g,'&quot;')}"></div>
          <div class="adm-input-row">
            <div class="adm-input-group"><div class="adm-label">Тег (текст)</div><input class="adm-input" id="ctedit-tagtext-${t.id}" value="${t.tagText||''}"></div>
            <div class="adm-input-group"><div class="adm-label">Цвет тега</div>
              <select class="adm-select" id="ctedit-tag-${t.id}">
                <option value="g"${t.tag==='g'?' selected':''}>🟢 Зелёный</option>
                <option value="fr"${t.tag==='fr'?' selected':''}>🔴 Красный</option>
                <option value="o"${t.tag==='o'?' selected':''}>🟠 Оранжевый</option>
                <option value="b"${t.tag==='b'?' selected':''}>🔵 Синий</option>
              </select>
            </div>
          </div>
          <div class="adm-input-row">
            <div class="adm-input-group"><div class="adm-label">Цвет обводки карточки</div><input class="adm-input" id="ctedit-border-${t.id}" value="${t.borderColor||''}" placeholder="rgba(0,255,120,0.35)"></div>
            <div class="adm-input-group"><div class="adm-label">Цвет тега NEW</div><input class="adm-input" id="ctedit-newcolor-${t.id}" value="${t.newTagColor||''}" placeholder="#5ab0ff"></div>
          </div>
          <div class="adm-check-row"><div class="adm-check-label">${AICO.star} Пометка NEW</div><button class="adm-toggle${t.isNew?' on':''}" id="ctedit-new-${t.id}" onclick="this.classList.toggle('on')"></button></div>
          <div style="display:flex;gap:8px">
            <button class="adm-btn adm-btn-primary" style="flex:1" onclick="admSaveCustomTask(${t.id})">${AICO.check} Сохранить</button>
            <button class="adm-btn" style="background:rgba(255,255,255,.06)" onclick="admToggleCustomTaskEdit(${t.id})">${AICO.trash} Отмена</button>
          </div>
        </div>
      </div>`).join('');
  }

  el.innerHTML = `
    <div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.tasks} Статические задания (${STATIC_TASKS.length})</div></div>
    ${staticHtml}
    ${customHtml || `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.tasks} Кастомные задания (0)</div></div>`}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Создать задание</div></div>
      <div class="adm-form">
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Тип</div><input class="adm-input" id="atask-type" placeholder="sub:channel / chat:channel / ref / case / wallet"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.desc} Название</div><input class="adm-input" id="atask-name" placeholder="Подписаться на канал"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.coin} Монеты</div><input class="adm-input" id="atask-rew" type="number" placeholder="500"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="atask-desc" placeholder="Подпишись на @channel"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.color} Тег (текст)</div><input class="adm-input" id="atask-tag-text" placeholder="Подписка"></div>
          <div class="adm-input-group">
            <div class="adm-label">${AICO.color} Цвет тега</div>
            <select class="adm-select" id="atask-tag">
              <option value="g">🟢 Зелёный</option>
              <option value="fr">🔴 Красный</option>
              <option value="o" selected>🟠 Оранжевый</option>
              <option value="b">🔵 Синий</option>
            </select>
          </div>
        </div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.color} Цвет обводки карточки</div><input class="adm-input" id="atask-border" placeholder="rgba(0,255,120,0.35)" style="font-size:12px"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.color} Цвет тега NEW</div><input class="adm-input" id="atask-newcolor" placeholder="#5ab0ff" style="font-size:12px"></div>
        </div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.star} Пометка NEW</div><button class="adm-toggle" id="atask-new-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateTask()">${AICO.plus} Создать задание</button>
      </div>
    </div>`;
}

function admToggleStaticTaskEdit(id) {
  const el = document.getElementById(`adm-stask-edit-${id}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function admToggleCustomTaskEdit(id) {
  const el = document.getElementById(`adm-ctask-edit-${id}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function admSaveCustomTask(id) {
  const name = document.getElementById(`ctedit-name-${id}`)?.value.trim();
  const rew = parseInt(document.getElementById(`ctedit-rew-${id}`)?.value || '0');
  const desc = document.getElementById(`ctedit-desc-${id}`)?.value.trim();
  const tag = document.getElementById(`ctedit-tag-${id}`)?.value || 'o';
  const tagText = document.getElementById(`ctedit-tagtext-${id}`)?.value.trim();
  const borderColor = document.getElementById(`ctedit-border-${id}`)?.value.trim();
  const newTagColor = document.getElementById(`ctedit-newcolor-${id}`)?.value.trim();
  const isNew = document.getElementById(`ctedit-new-${id}`)?.classList.contains('on');
  if (!name || !rew) { toast('Заполни название и монеты', 'r'); return; }
  const r = await admApi(`/tasks/${id}`, 'PATCH', { name, reward: rew, desc: desc||name, tag, tagText, borderColor, newTagColor, isNew });
  if (r.ok) { toast('Сохранено', 'g'); loadAdmTasks(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function admSaveStaticTask(id) {
  const name = document.getElementById(`stedit-name-${id}`)?.value.trim();
  const rew = parseInt(document.getElementById(`stedit-rew-${id}`)?.value || '0');
  const desc = document.getElementById(`stedit-desc-${id}`)?.value.trim();
  const tag = document.getElementById(`stedit-tag-${id}`)?.value.trim();
  const tc = document.getElementById(`stedit-tc-${id}`)?.value;
  const r = await admApi(`/tasks/static/${id}`, 'PATCH', { name, rew, desc, tag, tc });
  if (r.ok) { toast('Сохранено', 'g'); loadAdmTasks(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function admResetStaticTask(id) {
  const r = await admApi(`/tasks/static/${id}/override`, 'DELETE', {});
  if (r.ok) { toast('Сброшено', 'g'); loadAdmTasks(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function admCreateTask() {
  const type = document.getElementById('atask-type')?.value.trim();
  const name = document.getElementById('atask-name')?.value.trim();
  const rew = parseInt(document.getElementById('atask-rew')?.value||'0');
  const desc = document.getElementById('atask-desc')?.value.trim();
  const tag = document.getElementById('atask-tag')?.value || 'o';
  const borderColor = document.getElementById('atask-border')?.value.trim();
  const newTagColor = document.getElementById('atask-newcolor')?.value.trim();
  const isNew = document.getElementById('atask-new-toggle')?.classList.contains('on');
  if (!type || !name || !rew) { toast('Заполни все поля', 'r'); return; }
  const r = await admApi('/tasks', 'POST', { type, reward: rew, name, desc: desc||name, tag, isNew, borderColor: borderColor||undefined, newTagColor: newTagColor||undefined });
  if (r.ok) { toast(`Задание создано #${r.task.id}`, 'g'); loadAdmTasks(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteTask(id) {
  const r = await admApi('/tasks/'+id, 'DELETE', {});
  if (r.ok) { toast('Задание удалено', 'g'); loadAdmTasks(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ════════════════════════════════════════════
   SHOP ADMIN
════════════════════════════════════════════ */
async function loadAdmShop() {
  admLoading('adm-shop');
  const data = await admApi('/shop', 'GET');
  const el = document.getElementById('adm-shop');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admShopItems = data;

  let listHtml = '';
  if (admShopItems.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.shop} Товары (${admShopItems.length})</div></div>`;
    listHtml += admShopItems.map(it => {
      const imgThumb = it.imageUrl ? `<img src="${it.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.display='none'">` : '';
      const borderStyle = it.borderColor ? `border:1px solid ${it.borderColor}` : '';
      return `<div class="adm-item" style="${borderStyle}">
        ${imgThumb}
        <div class="adm-item-body">
          <div class="adm-item-name">${it.name}${it.tag?` <span class="adm-tag-pill" style="background:${it.tagColor||'rgba(255,255,255,.1)'}">${it.tag}</span>`:''}</div>
          <div class="adm-item-sub">${it.price} монет · #${it.id}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="adm-btn adm-btn-sm" onclick="admEditShopItem(${it.id})" title="Редактировать">${AICO.edit}</button>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteShopItem(${it.id})">${AICO.trash}</button>
        </div>
      </div>`;
    }).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.shop} Товаров нет</div>`;
  }

  el.innerHTML = `${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Добавить товар</div></div>
      <div class="adm-form">
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.desc} Название</div><input class="adm-input" id="ashop-name" placeholder="VIP 7 дней"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.coin} Цена</div><input class="adm-input" id="ashop-price" type="number" placeholder="500"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="ashop-desc" placeholder="Краткое описание товара"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.star} Тег (NEW / СКИДКА...)</div><input class="adm-input" id="ashop-tag" placeholder="NEW"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.color} Цвет тега</div><input class="adm-input" id="ashop-tagcolor" placeholder="#2ecc71" style="font-size:12px"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.color} Цвет обводки товара</div><input class="adm-input" id="ashop-border" placeholder="rgba(46,204,113,.3)" style="font-size:12px"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка (URL)</div><input class="adm-input" id="ashop-img" placeholder="https://..."></div>
        <div class="adm-input-group">
          <div class="adm-label">${AICO.upload} Загрузить фото с устройства</div>
          <label class="adm-file-label">
            ${AICO.upload} Выбрать фото
            <input type="file" accept="image/*" style="display:none" onchange="admUploadShopImgNew(event)">
          </label>
          <div id="ashop-img-status" class="adm-img-status"></div>
        </div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateShopItem()">${AICO.plus} Добавить товар</button>
      </div>
    </div>`;
}

async function admUploadShopImgNew(event) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById('ashop-img-status');
  if (status) status.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Загружаем...`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type;
    const tmpId = Date.now();
    const r = await admApi(`/shop/${tmpId}/image`, 'POST', { imageBase64: base64, mimeType });
    if (r.ok) {
      const imgInput = document.getElementById('ashop-img');
      if (imgInput) imgInput.value = r.imageUrl;
      if (status) status.innerHTML = `<span style="color:#00FFA3">${AICO.check} Загружено</span>`;
    } else {
      if (status) status.innerHTML = `<span style="color:#ff6b6b">${AICO.alert} ${r.error||'Ошибка'}</span>`;
    }
  };
  reader.readAsDataURL(file);
}

async function admCreateShopItem() {
  const name = document.getElementById('ashop-name')?.value.trim();
  const price = parseInt(document.getElementById('ashop-price')?.value||'0');
  const desc = document.getElementById('ashop-desc')?.value.trim();
  const tag = document.getElementById('ashop-tag')?.value.trim();
  const tagColor = document.getElementById('ashop-tagcolor')?.value.trim();
  const borderColor = document.getElementById('ashop-border')?.value.trim();
  const imageUrl = document.getElementById('ashop-img')?.value.trim();
  if (!name || !price) { toast('Заполни название и цену', 'r'); return; }
  const r = await admApi('/shop', 'POST', { name, price, desc, tag, tagColor, borderColor, imageUrl });
  if (r.ok) { toast(`Товар "${name}" добавлен`, 'g'); loadAdmShop(); }
  else toast(r.error||'Ошибка', 'r');
}

function admEditShopItem(id) {
  const item = admShopItems.find(i => i.id === id);
  if (!item) return;
  const el = document.getElementById('adm-shop');
  if (!el) return;
  const editId = `ashop-edit-${id}`;
  const existing = document.getElementById(editId);
  if (existing) { existing.remove(); return; }

  const editHtml = document.createElement('div');
  editHtml.id = editId;
  editHtml.className = 'adm-card';
  editHtml.style.marginTop = '8px';
  editHtml.innerHTML = `
    <div class="adm-card-hdr"><div class="adm-card-title">${AICO.edit} Редактировать #${id}</div></div>
    <div class="adm-form">
      <div class="adm-input-row">
        <div class="adm-input-group"><div class="adm-label">Название</div><input class="adm-input" id="ase-name-${id}" value="${item.name||''}"></div>
        <div class="adm-input-group"><div class="adm-label">Цена</div><input class="adm-input" id="ase-price-${id}" type="number" value="${item.price||0}"></div>
      </div>
      <div class="adm-input-group"><div class="adm-label">Описание</div><input class="adm-input" id="ase-desc-${id}" value="${item.desc||''}"></div>
      <div class="adm-input-row">
        <div class="adm-input-group"><div class="adm-label">Тег</div><input class="adm-input" id="ase-tag-${id}" value="${item.tag||''}"></div>
        <div class="adm-input-group"><div class="adm-label">Цвет тега</div><input class="adm-input" id="ase-tagc-${id}" value="${item.tagColor||''}" placeholder="#hex"></div>
      </div>
      <div class="adm-input-group"><div class="adm-label">Цвет обводки</div><input class="adm-input" id="ase-border-${id}" value="${item.borderColor||''}" placeholder="rgba(...)"></div>
      <div class="adm-input-group"><div class="adm-label">URL фото</div><input class="adm-input" id="ase-img-${id}" value="${item.imageUrl||''}" placeholder="https://..."></div>
      <div class="adm-input-group">
        <div class="adm-label">${AICO.upload} Загрузить новое фото</div>
        <label class="adm-file-label">
          ${AICO.upload} Выбрать фото
          <input type="file" accept="image/*" style="display:none" onchange="admUploadShopImg(event,${id})">
        </label>
        <div id="ase-img-status-${id}" class="adm-img-status"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="adm-btn adm-btn-primary" style="flex:1" onclick="admSaveShopItem(${id})">${AICO.check} Сохранить</button>
        <button class="adm-btn" style="flex:0 0 auto;background:rgba(255,255,255,.06)" onclick="document.getElementById('${editId}').remove()">${AICO.trash} Отмена</button>
      </div>
    </div>`;

  const itemEl = el.querySelector(`.adm-item [onclick*="admDeleteShopItem(${id})"]`)?.closest('.adm-item');
  if (itemEl) itemEl.after(editHtml);
  else el.querySelector('.adm-card').before(editHtml);
}

async function admUploadShopImg(event, id) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById(`ase-img-status-${id}`);
  if (status) status.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Загружаем...`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type;
    const r = await admApi(`/shop/${id}/image`, 'POST', { imageBase64: base64, mimeType });
    if (r.ok) {
      const imgInput = document.getElementById(`ase-img-${id}`);
      if (imgInput) imgInput.value = r.imageUrl;
      if (status) status.innerHTML = `<span style="color:#00FFA3">${AICO.check} Загружено</span>`;
    } else {
      if (status) status.innerHTML = `<span style="color:#ff6b6b">${AICO.alert} ${r.error||'Ошибка'}</span>`;
    }
  };
  reader.readAsDataURL(file);
}

async function admSaveShopItem(id) {
  const name = document.getElementById(`ase-name-${id}`)?.value.trim();
  const price = parseInt(document.getElementById(`ase-price-${id}`)?.value||'0');
  const desc = document.getElementById(`ase-desc-${id}`)?.value.trim();
  const tag = document.getElementById(`ase-tag-${id}`)?.value.trim();
  const tagColor = document.getElementById(`ase-tagc-${id}`)?.value.trim();
  const borderColor = document.getElementById(`ase-border-${id}`)?.value.trim();
  const imageUrl = document.getElementById(`ase-img-${id}`)?.value.trim();
  const r = await admApi(`/shop/${id}`, 'PATCH', { name, price, desc, tag, tagColor, borderColor, imageUrl });
  if (r.ok) { toast('Сохранено', 'g'); loadAdmShop(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteShopItem(id) {
  const r = await admApi('/shop/'+id, 'DELETE', {});
  if (r.ok) { toast('Товар удалён', 'g'); loadAdmShop(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ════════════════════════════════════════════
   DRAWS
════════════════════════════════════════════ */
async function loadAdmDraws() {
  admLoading('adm-draws');
  const data = await admApi('/draws', 'GET');
  const el = document.getElementById('adm-draws');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admDraws = data;
  const active = admDraws.active || [];
  const finished = admDraws.finished || [];

  let listHtml = '';
  if (active.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.gift} Активные (${active.length})</div></div>`;
    listHtml += active.map(d => admDrawCard(d)).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.gift} Нет активных розыгрышей</div>`;
  }

  // Завершённые розыгрыши
  if (finished.length) {
    listHtml += `<div class="adm-sec-hdr" style="margin-top:8px"><div class="adm-sec-label">${AICO.check} Завершённые (${finished.length})</div></div>`;
    listHtml += finished.map(d => admFinishedDrawCard(d)).join('');
  }

  el.innerHTML = `${listHtml}
    <div class="adm-card" id="adm-draw-create-form">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Создать розыгрыш</div></div>
      <div class="adm-form">
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.gift} Приз</div><input class="adm-input" id="adraw-prize" placeholder="1000 или iPhone 15"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.crown} Победителей</div><input class="adm-input" id="adraw-winners" type="number" value="1" min="1"></div>
        </div>
        <div class="adm-input-group">
          <div class="adm-label">${AICO.timer} Длительность</div>
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
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Название/описание</div><input class="adm-input" id="adraw-desc" placeholder="Описание розыгрыша"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка по URL</div><input class="adm-input" id="adraw-img" placeholder="https://..."></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.broadcast} Канал-условие (необязательно)</div><input class="adm-input" id="adraw-cond-chan" placeholder="@channel"></div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.ticket} Только по билету</div><button class="adm-toggle" id="adraw-ticket-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateDraw()">${AICO.plus} Создать розыгрыш</button>
      </div>
    </div>`;
}

function admDrawCard(d) {
  const left = Math.max(0, d.endsAt - Date.now());
  const leftStr = fmtDur(left) || 'завершается';
  const participantsCount = (d.participants||[]).length;
  const hasTicket = d.requireTicket;
  const imgThumb = d.imageUrl ? `<img src="${d.imageUrl}" onerror="this.style.display='none'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0">` : '';
  return `<div class="adm-draw-card" id="adm-draw-${d.id}">
    <div class="adm-draw-header">
      ${imgThumb}
      <div class="adm-draw-info">
        <div class="adm-draw-prize">${d.prize}${/^\d+$/.test(String(d.prize))?' монет':''}</div>
        <div class="adm-draw-meta">
          ${AICO.timer} ${leftStr} &nbsp;·&nbsp; ${AICO.users2} ${participantsCount} &nbsp;·&nbsp; ${AICO.crown} ${d.winnersCount||1} поб.
          ${hasTicket ? `&nbsp;·&nbsp; <span class="adm-ticket-badge">${AICO.ticket} Билет</span>` : ''}
        </div>
        <div class="adm-draw-id">#${d.id}</div>
      </div>
      <div class="adm-draw-btns">
        <button class="adm-btn adm-btn-sm" onclick="admToggleDrawEdit(${d.id})">${AICO.edit}</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteDraw(${d.id})">${AICO.trash}</button>
      </div>
    </div>
    <div class="adm-draw-edit" id="adm-draw-edit-${d.id}" style="display:none">
      <div class="adm-form" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">
        <div class="adm-input-group"><div class="adm-label">${AICO.gift} Приз</div><input class="adm-input" id="dedit-prize-${d.id}" value="${d.prize||''}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="dedit-desc-${d.id}" value="${d.desc||''}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка URL</div><input class="adm-input" id="dedit-img-${d.id}" value="${d.imageUrl||''}" placeholder="https://..."></div>
        <div class="adm-input-group">
          <div class="adm-label">${AICO.upload} Загрузить фото</div>
          <label class="adm-file-label">
            ${AICO.upload} Выбрать фото
            <input type="file" accept="image/*" style="display:none" onchange="admUploadDrawImg(event, ${d.id})">
          </label>
          <div id="dedit-img-status-${d.id}" class="adm-img-status"></div>
        </div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.ticket} Требует билет</div><button class="adm-toggle${d.requireTicket?' on':''}" id="dedit-ticket-${d.id}" onclick="this.classList.toggle('on')"></button></div>
        <div class="adm-label" style="margin-bottom:4px">${AICO.timer} Управление временем</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <button class="adm-btn adm-btn-sm" onclick="admExtendDrawTime(${d.id}, -3600000)">−1ч</button>
          <button class="adm-btn adm-btn-sm" onclick="admExtendDrawTime(${d.id}, -600000)">−10м</button>
          <button class="adm-btn adm-btn-sm adm-btn-green" onclick="admExtendDrawTime(${d.id}, 600000)">+10м</button>
          <button class="adm-btn adm-btn-sm adm-btn-green" onclick="admExtendDrawTime(${d.id}, 3600000)">+1ч</button>
          <button class="adm-btn adm-btn-sm adm-btn-green" onclick="admExtendDrawTime(${d.id}, 86400000)">+1д</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <button class="adm-btn adm-btn-primary" style="flex:1" onclick="admSaveDrawEdit(${d.id})">${AICO.check} Сохранить</button>
          <button class="adm-btn adm-btn-sm" style="background:rgba(255,140,0,.2);color:#ff8c00;border-color:rgba(255,140,0,.3)" onclick="admRerollDraw(${d.id})" title="Перекрутить победителей">${AICO.timer} Перекрутить</button>
        </div>
      </div>
    </div>
  </div>`;
}

function admToggleDrawEdit(id) {
  const el = document.getElementById(`adm-draw-edit-${id}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function admUploadDrawImg(event, drawId) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById(`dedit-img-status-${drawId}`);
  if (status) status.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Загружаем...`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type;
    const r = await admApi(`/draws/${drawId}/image`, 'POST', { imageBase64: base64, mimeType });
    if (r.ok) {
      const imgInput = document.getElementById(`dedit-img-${drawId}`);
      if (imgInput) imgInput.value = r.imageUrl;
      if (status) status.innerHTML = `<span style="color:#00FFA3">${AICO.check} Загружено</span>`;
    } else {
      if (status) status.innerHTML = `<span style="color:#ff6b6b">${AICO.alert} ${r.error||'Ошибка'}</span>`;
    }
  };
  reader.readAsDataURL(file);
}

async function admSaveDrawEdit(id) {
  const prize = document.getElementById(`dedit-prize-${id}`)?.value.trim();
  const desc = document.getElementById(`dedit-desc-${id}`)?.value.trim();
  const imageUrl = document.getElementById(`dedit-img-${id}`)?.value.trim();
  const requireTicket = document.getElementById(`dedit-ticket-${id}`)?.classList.contains('on');
  const r = await admApi(`/draws/${id}`, 'PATCH', { prize, desc, imageUrl, requireTicket });
  if (r.ok) { toast('Сохранено', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admCreateDraw() {
  const prize = document.getElementById('adraw-prize')?.value.trim();
  const timeMs = parseInt(document.getElementById('adraw-time')?.value||'3600000');
  const winnersCount = parseInt(document.getElementById('adraw-winners')?.value||'1');
  const imageUrl = document.getElementById('adraw-img')?.value.trim()||null;
  const desc = document.getElementById('adraw-desc')?.value.trim()||null;
  const chanCond = document.getElementById('adraw-cond-chan')?.value.trim()||null;
  const requireTicket = document.getElementById('adraw-ticket-toggle')?.classList.contains('on');
  if (!prize) { toast('Укажи приз', 'r'); return; }
  const r = await admApi('/draws', 'POST', { prize, timeMs, winnersCount, requireTicket, imageUrl });
  if (r.ok) {
    if (desc) await admApi(`/draws/${r.id}/desc`, 'PATCH', { desc });
    if (chanCond) await admApi(`/draws/${r.id}/conditions`, 'POST', { type:'tg', channel: chanCond.replace('@',''), name: chanCond });
    toast(`Розыгрыш #${r.id} создан`, 'g');
    loadAdmDraws();
  } else toast(r.error||'Ошибка', 'r');
}

async function admDeleteDraw(id) {
  const r = await admApi('/draws/'+id, 'DELETE', {});
  if (r.ok) { toast('Розыгрыш удалён', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteFinishedDraw(id) {
  if (!confirm('Удалить завершённый розыгрыш #'+id+'?')) return;
  const r = await admApi('/draws/finished/'+id, 'DELETE', {});
  if (r.ok) { toast('Удалено', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admRerollDraw(id) {
  if (!confirm('Перекрутить победителей розыгрыша #'+id+'? Текущие победители будут заменены.')) return;
  const r = await admApi('/draws/'+id+'/reroll', 'POST', {});
  if (r.ok) { toast('Победители перекручены', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admExtendDrawTime(id, addMs) {
  const r = await admApi('/draws/'+id+'/time', 'PATCH', { addMs });
  if (r.ok) { toast('Время обновлено', 'g'); loadAdmDraws(); }
  else toast(r.error||'Ошибка', 'r');
}

function admFinishedDrawCard(d) {
  const ts = d.finishedAt ? new Date(d.finishedAt).toLocaleDateString('ru') : '—';
  const winnersStr = (d.winners || []).map(w => w.firstName || w.username || w.uid).join(', ') || '—';
  const imgThumb = d.imageUrl ? `<img src="${d.imageUrl}" onerror="this.style.display='none'" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;opacity:.7">` : '';
  return `<div class="adm-draw-card" id="adm-fdraw-${d.id}" style="opacity:.85">
    <div class="adm-draw-header">
      ${imgThumb}
      <div class="adm-draw-info">
        <div class="adm-draw-prize">${d.prize}${/^\d+$/.test(String(d.prize))?' монет':''}</div>
        <div class="adm-draw-meta">${AICO.check} ${ts} &nbsp;·&nbsp; ${AICO.crown} ${winnersStr} &nbsp;·&nbsp; #${d.id}</div>
      </div>
      <div class="adm-draw-btns">
        <button class="adm-btn adm-btn-sm" onclick="admToggleFinishedDrawEdit(${d.id})">${AICO.edit}</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteFinishedDraw(${d.id})" title="Удалить">${AICO.trash}</button>
      </div>
    </div>
    <div class="adm-draw-edit" id="adm-fdraw-edit-${d.id}" style="display:none">
      <div class="adm-form" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">
        <div class="adm-input-group"><div class="adm-label">${AICO.gift} Приз</div><input class="adm-input" id="fdedit-prize-${d.id}" value="${(d.prize||'').toString().replace(/"/g,'&quot;')}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="fdedit-desc-${d.id}" value="${(d.desc||'').replace(/"/g,'&quot;')}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка URL</div><input class="adm-input" id="fdedit-img-${d.id}" value="${d.imageUrl||''}" placeholder="https://..."></div>
        <button class="adm-btn adm-btn-primary" onclick="admSaveFinishedDraw(${d.id})">${AICO.check} Сохранить</button>
      </div>
    </div>
  </div>`;
}

function admToggleFinishedDrawEdit(id) {
  const el = document.getElementById(`adm-fdraw-edit-${id}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function admSaveFinishedDraw(id) {
  const prize = document.getElementById(`fdedit-prize-${id}`)?.value.trim();
  const desc = document.getElementById(`fdedit-desc-${id}`)?.value.trim();
  const imageUrl = document.getElementById(`fdedit-img-${id}`)?.value.trim();
  const r = await admApi(`/draws/finished/${id}`, 'PATCH', { prize, desc, imageUrl });
  if (r.ok) { toast('Сохранено', 'g'); loadAdmDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ════════════════════════════════════════════
   ACCESS CONTROL
════════════════════════════════════════════ */
async function loadAdmAccess() {
  const el = document.getElementById('adm-access');
  if (!el) return;
  admLoading('adm-access');
  const data = await admApi('/access', 'GET');
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }

  const enabled = data.enabled;
  const whitelist = data.whitelist || [];

  const wlHtml = whitelist.length
    ? whitelist.map(u => `
        <div class="adm-item">
          <div class="adm-item-icon-svg">${AICO.users2}</div>
          <div class="adm-item-body">
            <div class="adm-item-name">${u.firstName || u.username || u.uid}</div>
            <div class="adm-item-sub">UID: ${u.uid}${u.username?' · @'+u.username:''}</div>
          </div>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admRemoveAccessUser('${u.uid}')">${AICO.trash}</button>
        </div>`).join('')
    : `<div class="adm-empty">${AICO.users2} Список пуст — все пользователи имеют доступ</div>`;

  el.innerHTML = `
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.star} Контроль доступа</div></div>
      <div class="adm-form">
        <div class="adm-check-row">
          <div class="adm-check-label">${AICO.star} Включить ограничение доступа</div>
          <button class="adm-toggle${enabled?' on':''}" id="access-enabled-toggle" onclick="this.classList.toggle('on')"></button>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:-4px;margin-bottom:8px">
          Если включено — только пользователи из белого списка смогут зайти в приложение. Администратор всегда имеет доступ.
        </div>
        <button class="adm-btn adm-btn-primary" onclick="admSaveAccessEnabled()">${AICO.check} Сохранить настройку</button>
      </div>
    </div>
    <div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.users2} Белый список (${whitelist.length})</div></div>
    ${wlHtml}
    <div class="adm-card" style="margin-top:8px">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Добавить пользователя</div></div>
      <div class="adm-form">
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.users2} UID</div><input class="adm-input" id="access-uid" placeholder="123456789" type="number"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.desc} Username</div><input class="adm-input" id="access-username" placeholder="@username"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Имя</div><input class="adm-input" id="access-firstname" placeholder="Иван"></div>
        <button class="adm-btn adm-btn-primary" onclick="admAddAccessUser()">${AICO.plus} Добавить</button>
      </div>
    </div>`;
}

async function admSaveAccessEnabled() {
  const enabled = document.getElementById('access-enabled-toggle')?.classList.contains('on');
  const r = await admApi('/access', 'POST', { enabled });
  if (r.ok) { toast(enabled ? 'Доступ ограничен' : 'Доступ открыт для всех', 'g'); loadAdmAccess(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function admAddAccessUser() {
  const uid = document.getElementById('access-uid')?.value.trim();
  const username = (document.getElementById('access-username')?.value || '').replace('@', '').trim();
  const firstName = document.getElementById('access-firstname')?.value.trim();
  if (!uid) { toast('Введи UID', 'r'); return; }
  const r = await admApi('/access/users', 'POST', { uid, username, firstName });
  if (r.ok) { toast('Добавлено', 'g'); loadAdmAccess(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function admRemoveAccessUser(uid) {
  const r = await admApi(`/access/users/${uid}`, 'DELETE', {});
  if (r.ok) { toast('Удалено', 'g'); loadAdmAccess(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ════════════════════════════════════════════
   PROMOS
════════════════════════════════════════════ */
async function loadAdmPromos() {
  admLoading('adm-promos');
  const data = await admApi('/promos', 'GET');
  const el = document.getElementById('adm-promos');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admPromos = data;

  let listHtml = '';
  if (admPromos.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.promos} Промокоды (${admPromos.length})</div></div>`;
    listHtml += admPromos.map(p => {
      const isFull = p.usedCount >= p.maxUses;
      const pct = p.maxUses ? Math.round(p.usedCount / p.maxUses * 100) : 0;
      return `<div class="adm-promo-item">
        <div class="adm-promo-top">
          <div class="adm-promo-code-wrap">
            <div class="adm-promo-code">${p.code}</div>
            ${p.vipOnly ? `<span class="adm-promo-vip">${AICO.crown} VIP</span>` : ''}
            ${isFull ? `<span class="adm-promo-done">${AICO.check} Разобран</span>` : ''}
          </div>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeletePromo('${p.code}')">${AICO.trash}</button>
        </div>
        <div class="adm-promo-reward">${AICO.coin} ${p.reward} монет · ${p.usedCount}/${p.maxUses} активаций</div>
        <div class="adm-promo-bar-wrap">
          <div class="adm-promo-bar"><div class="adm-promo-bar-fill${isFull?' full':''}" style="width:${pct}%"></div></div>
          <div class="adm-promo-count">${pct}%</div>
        </div>
        ${p.createdAt ? `<div class="adm-promo-date">${AICO.timer} Создан ${fmtDate(p.createdAt)}</div>` : ''}
      </div>`;
    }).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.promos} Промокодов нет</div>`;
  }

  el.innerHTML = `${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Создать промокод</div></div>
      <div class="adm-form">
        <div class="adm-input-group"><div class="adm-label">${AICO.promos} Код</div><input class="adm-input" id="apromo-code" placeholder="SUMMER500" autocapitalize="characters" style="text-transform:uppercase"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.coin} Монеты</div><input class="adm-input" id="apromo-rew" type="number" placeholder="500"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.users2} Активаций</div><input class="adm-input" id="apromo-uses" type="number" placeholder="100"></div>
        </div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.crown} Только для VIP</div><button class="adm-toggle" id="apromo-vip-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreatePromo()">${AICO.plus} Создать промокод</button>
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
  if (r.ok) { toast(`Промокод ${r.code} создан`, 'g'); loadAdmPromos(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeletePromo(code) {
  const r = await admApi(`/promos/${encodeURIComponent(code)}`, 'DELETE', {});
  if (r.ok) { toast(`Промокод ${code} удалён`, 'g'); loadAdmPromos(); }
  else toast(r.error||'Ошибка', 'r');
}

/* ════════════════════════════════════════════
   NOTIFICATIONS / BROADCAST
════════════════════════════════════════════ */
async function loadAdmNotifs() {
  admLoading('adm-notifs');
  const data = await admApi('/notifications', 'GET');
  const el = document.getElementById('adm-notifs');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admNotifs = data;

  const typeIco = { promo: AICO.gift, win: AICO.crown, system: AICO.bell, alert: AICO.alert };

  let listHtml = '';
  if (admNotifs.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.bell} Уведомления (${admNotifs.length})</div><button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admClearNotifs()">${AICO.trash} Очистить</button></div>`;
    listHtml += admNotifs.slice(0, 20).map(n => `
      <div class="adm-item">
        <div class="adm-item-icon-svg">${typeIco[n.type]||AICO.bell}</div>
        <div class="adm-item-body">
          <div class="adm-item-name" style="white-space:normal;line-height:1.3">${n.text}</div>
          <div class="adm-item-sub">${n.type} · ${fmtDate(n.ts)}</div>
        </div>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteNotif(${n.id})">${AICO.trash}</button>
      </div>`).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.bell} Уведомлений нет</div>`;
  }

  el.innerHTML = `${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.bell} Уведомление в приложении</div></div>
      <div class="adm-form">
        <div class="adm-input-group">
          <div class="adm-label">Тип уведомления</div>
          <div class="adm-notif-type">
            <button class="adm-notif-type-btn sel" data-type="system" onclick="admSelectNotifType(this)">${AICO.bell} Система</button>
            <button class="adm-notif-type-btn" data-type="promo" onclick="admSelectNotifType(this)">${AICO.gift} Промо</button>
            <button class="adm-notif-type-btn" data-type="win" onclick="admSelectNotifType(this)">${AICO.crown} Победа</button>
            <button class="adm-notif-type-btn" data-type="alert" onclick="admSelectNotifType(this)">${AICO.alert} Важно</button>
          </div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Текст</div><textarea class="adm-textarea" id="anotif-text" placeholder="Текст уведомления для всех..."></textarea></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateNotif()">${AICO.send} Отправить в приложение</button>
      </div>
    </div>
    <div class="adm-card" style="margin-top:10px">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.broadcast} Рассылка в Telegram</div></div>
      <div class="adm-form">
        <textarea class="adm-textarea" id="abroadcast-text" placeholder="Текст для рассылки всем пользователям в Telegram..."></textarea>
        <button class="adm-btn adm-btn-broadcast" onclick="admBroadcast()">${AICO.broadcast} Разослать в Telegram</button>
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
  if (r.ok) { toast('Уведомление отправлено', 'g'); loadAdmNotifs(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteNotif(id) {
  const r = await admApi(`/notifications/${id}`, 'DELETE', {});
  if (r.ok) { toast('Удалено', 'g'); loadAdmNotifs(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admClearNotifs() {
  if (!admNotifs.length) return;
  await Promise.all(admNotifs.map(n => admApi(`/notifications/${n.id}`, 'DELETE', {})));
  toast('Уведомления очищены', 'g');
  loadAdmNotifs();
}

async function admBroadcast() {
  const text = document.getElementById('abroadcast-text')?.value.trim();
  if (!text) { toast('Введи текст', 'r'); return; }
  const btn = document.querySelector('.adm-btn-broadcast');
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="adm-spin" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Рассылка...`; }
  const r = await admApi('/broadcast', 'POST', { text });
  if (btn) { btn.disabled = false; btn.innerHTML = `${AICO.broadcast} Разослать в Telegram`; }
  if (r.ok) toast(`Отправлено: ${r.sent}, ошибок: ${r.failed}`, 'g');
  else toast(r.error||'Ошибка', 'r');
}
