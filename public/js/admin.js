/* ══ ADMIN PANEL ══ */
const ADMIN_UID = '6151671553';
let admTab = 'dashboard';
let admUsers = [], admTasks = [], admDraws = {active:[], finished:[]}, admPromos = [], admNotifs = [];

/* ── SVG icons ── */
const AICO = {
  dashboard: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  users:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  tasks:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  draws:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  promos:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  notifs:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  plus:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  edit:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  shield:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  backup:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 16 20 20 4 20 4 16"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="4" x2="12" y2="16"/></svg>`,
  send:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  coin:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  gift:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  broadcast: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 11.22a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 2.55h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  search:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  star:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  crown:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><line x1="5" y1="20" x2="19" y2="20"/></svg>`,
  check:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  bell:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  timer:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  img:       `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  upload:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  ticket:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
  desc:      `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  users2:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

function admApi(path, method, body) {
  const sep = path.includes('?') ? '&' : '?';
  const url = (method === 'GET' || !method) ? `/api/admin${path}${sep}userId=${UID}` : `/api/admin${path}`;
  const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify({ ...body, userId: UID });
  return fetch(url, opts)
    .then(r => r.json())
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
  const nav = document.getElementById('main-nav');
  if (nav && !document.getElementById('nb-admin')) {
    const btn = document.createElement('button');
    btn.className = 'nb';
    btn.id = 'nb-admin';
    btn.onclick = () => go('admin');
    btn.innerHTML = `<div class="nb-icon">${AICO.shield}<div class="nb-red"></div></div><span class="nb-label">Админ</span>`;
    nav.appendChild(btn);
    if (!PAGES.includes('admin')) PAGES.push('admin');
  }
}

/* ── Load section ───────────────────────────── */
async function loadAdminSection(tab) {
  admTab = tab;
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.adm-section').forEach(s => s.classList.toggle('active', s.id === 'adm-' + tab));
  if (tab === 'dashboard') await loadAdmDashboard();
  else if (tab === 'users')  await loadAdmUsers();
  else if (tab === 'tasks')  await loadAdmTasks();
  else if (tab === 'draws')  await loadAdmDraws();
  else if (tab === 'promos') await loadAdmPromos();
  else if (tab === 'notifs') await loadAdmNotifs();
}

function admLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="adm-loading"><div class="adm-spin"></div>Загружаем...</div>`;
}

/* ════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════ */
async function loadAdmDashboard() {
  admLoading('adm-dashboard');
  const d = await admApi('/stats', 'GET');
  if (d.error) { document.getElementById('adm-dashboard').innerHTML = `<div class="adm-err">${AICO.alert} ${d.error}</div>`; return; }

  const statItems = [
    { icon: AICO.users,  val: d.users||0,         label: 'Пользователи' },
    { icon: AICO.draws,  val: d.draws||0,          label: 'Розыгрыши' },
    { icon: AICO.tasks,  val: d.tasks||0,          label: 'Задания' },
    { icon: AICO.promos, val: d.promos||0,         label: 'Промокоды' },
    { icon: AICO.notifs, val: d.notifications||0,  label: 'Уведомления' },
  ];

  let html = `<div class="adm-stats">`;
  for (const s of statItems) html += `<div class="adm-stat"><div class="adm-stat-icon">${s.icon}</div><div class="adm-stat-val">${s.val}</div><div class="adm-stat-label">${s.label}</div></div>`;
  html += `</div>`;

  if (d.topUsers && d.topUsers.length) {
    html += `<div class="adm-card"><div class="adm-card-hdr"><div class="adm-card-title">${AICO.crown} Топ по балансу</div></div>`;
    d.topUsers.forEach((u, i) => {
      const medal = ['🥇','🥈','🥉'][i] || (i+1);
      html += `<div class="adm-top-row"><div class="adm-top-rank">${medal}</div><div class="adm-top-name">${u.username?'@'+u.username:u.firstName||'?'}</div><div class="adm-top-bal">${(u.balance||0).toLocaleString('ru')}&nbsp;${AICO.coin}</div></div>`;
    });
    html += `</div>`;
  }

  html += `<div class="adm-backup-row">
    <div class="adm-backup-info">
      <div class="adm-backup-title">${AICO.backup} Бэкап базы данных</div>
      <div class="adm-backup-sub">Сохранить db.json на GitHub (ветка db-backup)</div>
    </div>
    <button class="adm-btn adm-btn-sm adm-btn-blue" onclick="admBackupNow(this)">${AICO.backup} Бэкап</button>
  </div>`;

  document.getElementById('adm-dashboard').innerHTML = html;
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
  if (data.error) { document.getElementById('adm-user-list').innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}<br><small style="opacity:.6">UID: ${UID}</small></div>`; return; }
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
  el.innerHTML = list.slice(0, 100).map(u => {
    const initials = (u.firstName || u.username || '?')[0].toUpperCase();
    const name = u.username ? '@'+u.username : (u.firstName||'—');
    const sub = `${(u.balance||0).toLocaleString('ru')} монет · ${u.refs||0} реф.${u.banned?' · 🚫':''}`;
    return `<div class="adm-user-item" onclick="admViewUser('${u.uid}')" style="cursor:pointer">
      <div class="adm-user-avatar">${initials}</div>
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
  const vipStr = d.vipActive ? `✅ Активна до ${fmtDate(d.vipExpiry)}` : '—';
  const invItems = Object.entries(d.inventory||{}).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${v}`).join(', ') || '—';
  const txHtml = (d.transactions||[]).length
    ? (d.transactions||[]).map(t=>`<div class="adm-up-row"><span style="opacity:.5">${t.date}</span><span>${t.details||t.type}</span><span style="color:${String(t.amount).startsWith('+')?'#00FFA3':'#ff6b6b'};font-weight:700">${t.amount}</span></div>`).join('')
    : '<div style="opacity:.4;font-size:11px">Транзакций нет</div>';

  body.innerHTML = `
    <div class="adm-up-avatar">${(d.firstName||d.username||'?')[0].toUpperCase()}</div>
    <div class="adm-up-name">${fullName}</div>
    <div class="adm-up-uid">ID: ${d.uid}${d.banned?' · <span style="color:#ff6b6b">🚫 Забанен</span>':''}</div>
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
    <div class="adm-up-row"><span>🎨 Цвет ника</span><span>${d.nickColor?`<span style="color:${d.nickColor}">${d.nickColor}</span>`:'—'}</span></div>
    <div class="adm-up-row"><span>🌟 Легенда</span><span>${d.legendActive?`✅ (${d.legendColor})`:'—'}</span></div>
    <div class="adm-up-row"><span>💼 Кошелёк</span><span style="font-size:9px;word-break:break-all">${d.walletAddress||'—'}</span></div>
    <div class="adm-up-row"><span>📦 Инвентарь</span><span style="font-size:10px">${invItems}</span></div>
    <div class="adm-up-row"><span>📅 Регистрация</span><span>${d.regDate||'—'}</span></div>
    <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:10px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);margin-bottom:8px">Последние транзакции</div>
      ${txHtml}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="adm-btn adm-btn-green" style="flex:1" onclick="admCloseUserMo();admOpenBalance('${d.username||d.uid}','add')">${AICO.plus} Начислить</button>
      <button class="adm-btn adm-btn-danger" style="flex:1" onclick="admCloseUserMo();admOpenBalance('${d.username||d.uid}','remove')">&minus; Снять</button>
    </div>`;
}

function admCloseUserMo() {
  const mo = document.getElementById('adm-user-mo');
  if (mo) mo.style.display = 'none';
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
    const body = document.getElementById('gm-body');
    if (body && !document.getElementById('gm-extra-input')) {
      const inp = document.createElement('input');
      inp.id = 'gm-extra-input'; inp.className = 'adm-input';
      inp.type = 'number'; inp.placeholder = 'Сумма монет'; inp.style.marginTop = '12px';
      body.appendChild(inp); inp.focus();
    }
  }, 60);
}

/* ════════════════════════════════════════════
   TASKS
════════════════════════════════════════════ */
async function loadAdmTasks() {
  admLoading('adm-tasks');
  const data = await admApi('/tasks', 'GET');
  const el = document.getElementById('adm-tasks');
  if (!el) return;
  if (data.error) { el.innerHTML = `<div class="adm-err">${AICO.alert} ${data.error}</div>`; return; }
  admTasks = data;

  let listHtml = '';
  if (admTasks.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.tasks} Задания (${admTasks.length})</div></div>`;
    listHtml += admTasks.map(t => `
      <div class="adm-item">
        <div class="adm-item-icon-svg">${AICO.tasks}</div>
        <div class="adm-item-body">
          <div class="adm-item-name">${t.name}</div>
          <div class="adm-item-sub">${t.rew} монет · #${t.id} · ${t.tag}</div>
        </div>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteTask(${t.id})">${AICO.trash}</button>
      </div>`).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.tasks} Заданий нет</div>`;
  }

  el.innerHTML = `${listHtml}
    <div class="adm-card">
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.plus} Создать задание</div></div>
      <div class="adm-form">
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Тип</div><input class="adm-input" id="atask-type" placeholder="sub:channel / chat:channel / ref / case / wallet"></div>
        <div class="adm-input-row">
          <div class="adm-input-group"><div class="adm-label">${AICO.desc} Название</div><input class="adm-input" id="atask-name" placeholder="Подписаться на канал"></div>
          <div class="adm-input-group"><div class="adm-label">${AICO.coin} Монеты</div><input class="adm-input" id="atask-rew" type="number" placeholder="500"></div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="atask-desc" placeholder="Подпишись на @channel"></div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.star} Пометка NEW</div><button class="adm-toggle" id="atask-new-toggle" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateTask()">${AICO.plus} Создать задание</button>
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
  if (r.ok) { toast(`Задание создано #${r.task.id}`, 'g'); loadAdmTasks(); }
  else toast(r.error||'Ошибка', 'r');
}

async function admDeleteTask(id) {
  const r = await admApi('/tasks/'+id, 'DELETE', {});
  if (r.ok) { toast('Задание удалено', 'g'); loadAdmTasks(); }
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

  let listHtml = '';
  if (active.length) {
    listHtml = `<div class="adm-sec-hdr"><div class="adm-sec-label">${AICO.gift} Активные (${active.length})</div></div>`;
    listHtml += active.map(d => admDrawCard(d)).join('');
  } else {
    listHtml = `<div class="adm-empty">${AICO.gift} Нет активных розыгрышей</div>`;
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
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание (необязательно)</div><input class="adm-input" id="adraw-desc" placeholder="Описание розыгрыша"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка по URL (необязательно)</div><input class="adm-input" id="adraw-img" placeholder="https://..."></div>
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
  const imgThumb = d.imageUrl ? `<div class="adm-draw-thumb"><img src="${d.imageUrl}" onerror="this.parentElement.style.display='none'" style="width:100%;height:100%;object-fit:cover;border-radius:6px"></div>` : '';
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
        <button class="adm-btn adm-btn-sm" onclick="admToggleDrawEdit(${d.id})" title="Редактировать">${AICO.edit}</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeleteDraw(${d.id})" title="Удалить">${AICO.trash}</button>
      </div>
    </div>
    <div class="adm-draw-edit" id="adm-draw-edit-${d.id}" style="display:none">
      <div class="adm-form" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">
        <div class="adm-input-group"><div class="adm-label">${AICO.gift} Приз</div><input class="adm-input" id="dedit-prize-${d.id}" value="${d.prize||''}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Описание</div><input class="adm-input" id="dedit-desc-${d.id}" value="${d.desc||''}"></div>
        <div class="adm-input-group"><div class="adm-label">${AICO.img} Картинка по URL</div><input class="adm-input" id="dedit-img-${d.id}" value="${d.imageUrl||''}" placeholder="https://..."></div>
        <div class="adm-input-group">
          <div class="adm-label">${AICO.upload} Загрузить фото с устройства</div>
          <label class="adm-file-label" onclick="">
            ${AICO.upload} Выбрать фото
            <input type="file" accept="image/*" style="display:none" onchange="admUploadDrawImg(event, ${d.id})">
          </label>
          <div id="dedit-img-status-${d.id}" class="adm-img-status"></div>
        </div>
        <div class="adm-check-row"><div class="adm-check-label">${AICO.ticket} Требует билет</div><button class="adm-toggle${d.requireTicket?' on':''}" id="dedit-ticket-${d.id}" onclick="this.classList.toggle('on')"></button></div>
        <button class="adm-btn adm-btn-primary" onclick="admSaveDrawEdit(${d.id})">${AICO.check} Сохранить</button>
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
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(',')[1];
    const mimeType = file.type;
    const r = await admApi(`/draws/${drawId}/image`, 'POST', { imageBase64: base64, mimeType });
    if (r.ok) {
      const imgInput = document.getElementById(`dedit-img-${drawId}`);
      if (imgInput) imgInput.value = r.imageUrl;
      if (status) status.innerHTML = `<span style="color:#00FFA3">${AICO.check} Загружено: ${r.imageUrl}</span>`;
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
      let soldOutStr = '';
      if (p.soldOutAt && p.createdAt) {
        soldOutStr = `<span class="adm-promo-soldout">${AICO.timer} Разобрали за ${fmtSoldOut(p.soldOutAt - p.createdAt)}</span>`;
      }
      return `<div class="adm-promo-item">
        <div class="adm-promo-top">
          <div class="adm-promo-code-wrap">
            <div class="adm-promo-code">${p.code}</div>
            ${p.vipOnly ? `<span class="adm-promo-vip">${AICO.crown} VIP</span>` : ''}
            ${isFull ? `<span class="adm-promo-done">${AICO.check} Разобран</span>` : ''}
          </div>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="admDeletePromo('${p.code}')">${AICO.trash}</button>
        </div>
        <div class="adm-promo-reward">${AICO.coin} ${p.reward} монет за активацию</div>
        <div class="adm-promo-bar-wrap">
          <div class="adm-promo-bar"><div class="adm-promo-bar-fill${isFull?' full':''}" style="width:${pct}%"></div></div>
          <div class="adm-promo-count">${p.usedCount} / ${p.maxUses}</div>
        </div>
        ${soldOutStr}
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
   NOTIFICATIONS
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
      <div class="adm-card-hdr"><div class="adm-card-title">${AICO.send} Создать уведомление</div></div>
      <div class="adm-form">
        <div class="adm-input-group">
          <div class="adm-label">${AICO.bell} Тип</div>
          <div class="adm-notif-type">
            <button class="adm-notif-type-btn sel" data-type="system" onclick="admSelectNotifType(this)">${AICO.bell} Система</button>
            <button class="adm-notif-type-btn" data-type="promo" onclick="admSelectNotifType(this)">${AICO.gift} Промо</button>
            <button class="adm-notif-type-btn" data-type="win" onclick="admSelectNotifType(this)">${AICO.crown} Победа</button>
            <button class="adm-notif-type-btn" data-type="alert" onclick="admSelectNotifType(this)">${AICO.alert} Важно</button>
          </div>
        </div>
        <div class="adm-input-group"><div class="adm-label">${AICO.desc} Текст</div><textarea class="adm-textarea" id="anotif-text" placeholder="Текст уведомления для всех пользователей..."></textarea></div>
        <button class="adm-btn adm-btn-primary" onclick="admCreateNotif()">${AICO.send} Отправить уведомление</button>
        <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:12px;margin-top:4px">
          <div class="adm-label" style="margin-bottom:8px">${AICO.broadcast} Telegram рассылка</div>
          <textarea class="adm-textarea" id="abroadcast-text" placeholder="Текст для рассылки в Telegram всем пользователям..." style="min-height:60px"></textarea>
          <button class="adm-btn adm-btn-broadcast" onclick="admBroadcast()">${AICO.broadcast} Разослать в Telegram</button>
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
