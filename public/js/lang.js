/* ══════════════════════════════════════════════════════════
   LANG.JS — Переводы + Темы + Попап аватарки
══════════════════════════════════════════════════════════ */

const TRANSLATIONS = {
  ru: {
    /* Home */
    'welcome':          'Добро пожаловать,',
    'mc-tasks':         'Задания',
    'mc-tasks-s':       'Выполняй и зарабатывай',
    'mc-shop':          'Магазин',
    'mc-shop-s':        'Трать монеты',
    'mc-raffles':       'Розыгрыши',
    'mc-raffles-s':     'Испытай удачу',
    'mc-friends':       'Рефералы',
    'mc-friends-s':     'Приглашай друзей',
    'mc-inventory':     'Инвентарь',
    'mc-inventory-s':   'Твои предметы и бонусы',
    'promo-lbl':        'Промокод',
    'promo-all':        'Все',
    'home-raffles-sec': 'Розыгрыши',
    'no-raffles':       'Пока розыгрышей нет',
    /* Nav */
    'nav-home':         'Главная',
    'nav-tasks':        'Задания',
    'nav-shop':         'Магазин',
    'nav-pvp':          'PvP',
    'nav-profile':      'Профиль',
    /* Titles */
    'title-tasks':      'Задания',
    'title-shop':       'Магазин',
    'title-inventory':  'Инвентарь',
    'title-raffles':    'Розыгрыши',
    'title-friends':    'Рефералы',
    'title-profile':    'Профиль',
    'title-pvp':        'ПвП',
    /* Shop */
    'shop-tab-items':   '🛒 Магазин',
    'shop-tab-cases':   '📦 Кейсы',
    /* Raffles */
    'raf-tab-active':   '🎁 Активные',
    'raf-tab-done':     '🏆 Завершённые',
    /* Profile */
    'pro-lbl-balance':  'Баланс монет',
    'pro-lbl-stars':    'Баланс Stars',
    'pro-lbl-support':  'Нужна помощь?',
    'pro-support-link': 'Поддержка',
    'pro-lbl-refs':     'Рефералов',
    'pro-lbl-vip':      'VIP статус',
    'pro-lbl-color':    'Цвет ника',
    'pro-lbl-effect':   'Эффект входа',
    'pro-lbl-reg':      'Дата регистрации',
    'pro-promo-lbl':    'Промокод',
    'tx-title':         'Транзакции',
    'tx-h-status':      'Статус',
    'tx-h-amt':         'Сумма',
    'tx-h-det':         'Подробности',
    'tx-h-date':        'Дата',
    'tx-empty':         'Нет транзакций',
    /* Friends */
    'ref-lbl':          'Реферальная ссылка',
    'ref-desc':         'За каждого приглашённого вы получаете',
    'ref-share':        'Поделиться в Telegram',
    'ref-c1-lbl':       'Лично приглашённые',
    'ref-c1-sub':       '+1000 за каждого',
    'ref-c2-lbl':       '2-й уровень',
    'ref-c2-sub':       'Скоро',
    'ref-earn-lbl':     'Заработано',
    'ref-sec':          'Ваши рефералы',
    /* Promo */
    'promo-ph':         'Введите промокод',
    'promo-btn':        'Применить',
    /* Popup */
    'popup-dark':       'Тёмная',
    'popup-light':      'Светлая',
    /* PvP menu cards */
    'pvp-mode-hint':    'Выбери режим игры',
    'pvp-duel-title':   'Дуэль',
    'pvp-duel-desc':    'Сразись с другими игроками',
    'pvp-solo-title':   'Соло',
    'pvp-solo-desc':    'Крути колесо удачи',
    'pvp-mines-title':  'Мины',
    'pvp-mines-desc':   'Открывай клетки, избегай мин',
    /* PvP inner */
    'btn-back':         'Назад',
    'pvp-no-game':      'Нет активной игры',
    'pvp-howto':        'Как играть',
    'pvp-your-bet':     'Твоя ставка',
    'pvp-join-btn':     '⚔️ Участвовать',
    'pvp-leave-btn':    '↩️ Выйти (вернуть монеты)',
    'pvp-history':      'История игр',
    /* Solo */
    'solo-spin-btn':    'Крутить',
    'solo-choose-prize':'Выбрать приз',
  },
  en: {
    /* Home */
    'welcome':          'Welcome,',
    'mc-tasks':         'Tasks',
    'mc-tasks-s':       'Complete & earn',
    'mc-shop':          'Shop',
    'mc-shop-s':        'Spend coins',
    'mc-raffles':       'Raffles',
    'mc-raffles-s':     'Try your luck',
    'mc-friends':       'Referrals',
    'mc-friends-s':     'Invite friends',
    'mc-inventory':     'Inventory',
    'mc-inventory-s':   'Your items & bonuses',
    'promo-lbl':        'Promo code',
    'promo-all':        'All',
    'home-raffles-sec': 'Raffles',
    'no-raffles':       'No raffles yet',
    /* Nav */
    'nav-home':         'Home',
    'nav-tasks':        'Tasks',
    'nav-shop':         'Shop',
    'nav-pvp':          'PvP',
    'nav-profile':      'Profile',
    /* Titles */
    'title-tasks':      'Tasks',
    'title-shop':       'Shop',
    'title-inventory':  'Inventory',
    'title-raffles':    'Raffles',
    'title-friends':    'Referrals',
    'title-profile':    'Profile',
    'title-pvp':        'PvP',
    /* Shop */
    'shop-tab-items':   '🛒 Shop',
    'shop-tab-cases':   '📦 Cases',
    /* Raffles */
    'raf-tab-active':   '🎁 Active',
    'raf-tab-done':     '🏆 Finished',
    /* Profile */
    'pro-lbl-balance':  'Coin balance',
    'pro-lbl-stars':    'Stars balance',
    'pro-lbl-support':  'Need help?',
    'pro-support-link': 'Support',
    'pro-lbl-refs':     'Referrals',
    'pro-lbl-vip':      'VIP status',
    'pro-lbl-color':    'Nick color',
    'pro-lbl-effect':   'Entry effect',
    'pro-lbl-reg':      'Registered',
    'pro-promo-lbl':    'Promo code',
    'tx-title':         'Transactions',
    'tx-h-status':      'Status',
    'tx-h-amt':         'Amount',
    'tx-h-det':         'Details',
    'tx-h-date':        'Date',
    'tx-empty':         'No transactions',
    /* Friends */
    'ref-lbl':          'Referral link',
    'ref-desc':         'You earn for each invited friend',
    'ref-share':        'Share in Telegram',
    'ref-c1-lbl':       'Direct referrals',
    'ref-c1-sub':       '+1000 each',
    'ref-c2-lbl':       '2nd level',
    'ref-c2-sub':       'Coming soon',
    'ref-earn-lbl':     'Earned',
    'ref-sec':          'Your referrals',
    /* Promo */
    'promo-ph':         'Enter promo code',
    'promo-btn':        'Apply',
    /* Popup */
    'popup-dark':       'Dark',
    'popup-light':      'Light',
    /* PvP menu cards */
    'pvp-mode-hint':    'Choose game mode',
    'pvp-duel-title':   'Duel',
    'pvp-duel-desc':    'Battle other players',
    'pvp-solo-title':   'Solo',
    'pvp-solo-desc':    'Spin the lucky wheel',
    'pvp-mines-title':  'Mines',
    'pvp-mines-desc':   'Open cells, avoid mines',
    /* PvP inner */
    'btn-back':         'Back',
    'pvp-no-game':      'No active game',
    'pvp-howto':        'How to play',
    'pvp-your-bet':     'Your bet',
    'pvp-join-btn':     '⚔️ Join',
    'pvp-leave-btn':    '↩️ Leave (refund)',
    'pvp-history':      'Game history',
    /* Solo */
    'solo-spin-btn':    'Spin',
    'solo-choose-prize':'Choose prize',
  }
};

/* ── State ── */
let _lang  = localStorage.getItem('gb_lang')  || 'ru';
let _theme = localStorage.getItem('gb_theme') || 'dark';

/* ════════════════════════════
   APPLY LANGUAGE
════════════════════════════ */
function applyLang(lang) {
  _lang = lang;
  localStorage.setItem('gb_lang', lang);
  const T = TRANSLATIONS[lang] || TRANSLATIONS.ru;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (T[key] !== undefined) el.textContent = T[key];
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (T[key] !== undefined) el.placeholder = T[key];
  });

  const btnRu = document.getElementById('popup-btn-ru');
  const btnEn = document.getElementById('popup-btn-en');
  if (btnRu) btnRu.classList.toggle('ppu-active', lang === 'ru');
  if (btnEn) btnEn.classList.toggle('ppu-active', lang === 'en');
}

/* ════════════════════════════
   APPLY THEME
════════════════════════════ */
function applyTheme(theme) {
  _theme = theme;
  localStorage.setItem('gb_theme', theme);
  document.body.classList.toggle('theme-light', theme === 'light');

  const btnDark  = document.getElementById('popup-btn-dark');
  const btnLight = document.getElementById('popup-btn-light');
  if (btnDark)  btnDark.classList.toggle('ppu-active', theme === 'dark');
  if (btnLight) btnLight.classList.toggle('ppu-active', theme === 'light');
}

/* ════════════════════════════
   POPUP
════════════════════════════ */
let _popupOpen = false;
function toggleAvPopup() { _popupOpen ? closeAvPopup() : openAvPopup(); }
function openAvPopup() {
  _popupOpen = true;
  document.getElementById('av-popup').classList.add('ppu-visible');
  document.getElementById('av-popup-ov').classList.add('ppu-ov-visible');
  document.getElementById('av-wrap-h').classList.add('av-popup-open');
}
function closeAvPopup() {
  _popupOpen = false;
  document.getElementById('av-popup').classList.remove('ppu-visible');
  document.getElementById('av-popup-ov').classList.remove('ppu-ov-visible');
  document.getElementById('av-wrap-h').classList.remove('av-popup-open');
}

/* ════════════════════════════
   INIT
════════════════════════════ */
function _initLangTheme() {
  applyTheme(_theme);
  applyLang(_lang);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initLangTheme);
} else {
  _initLangTheme();
}

/* ════════════════════════════
   NOTIFICATIONS
════════════════════════════ */
const _NOTIF_KEY = 'gb4_notifs_' + (typeof UID !== 'undefined' ? UID : 'u');
let _notifPanelOpen = false;
let _notifLastId = 0;
let _notifToastTimer = null;

const _NOTIF_ICONS = { promo:'🎁', win:'🏆', system:'🔔', alert:'⚠️' };
const _NOTIF_TITLES = { promo:'Акция', win:'Победа!', system:'Уведомление', alert:'Важно' };

function _loadNotifs() {
  try { return JSON.parse(localStorage.getItem(_NOTIF_KEY) || '[]'); } catch(e) { return []; }
}
function _saveNotifs(arr) {
  try { localStorage.setItem(_NOTIF_KEY, JSON.stringify(arr)); } catch(e) {}
}

function _notifTimeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff/60) + ' мин назад';
  if (diff < 86400) return Math.floor(diff/3600) + ' ч назад';
  if (diff < 172800) return 'вчера';
  return new Date(ts).toLocaleDateString('ru', {day:'numeric', month:'short'});
}

function renderNotifBadge() {
  const notifs = _loadNotifs();
  const unread = notifs.filter(function(n){ return !n.read; }).length;
  const dot   = document.getElementById('ppu-notif-dot');
  const count = document.getElementById('ppu-notif-count');
  if (dot)   dot.style.display   = unread > 0 ? 'block' : 'none';
  if (count) {
    count.style.display = unread > 0 ? 'block' : 'none';
    count.textContent   = unread > 9 ? '9+' : unread;
  }
}

function renderNotifList() {
  const notifs = _loadNotifs();
  const list  = document.getElementById('ppu-notif-list');
  const empty = document.getElementById('ppu-notif-empty');
  const hdr   = document.getElementById('ppu-notif-panel-hdr');
  if (!list) return;
  const hasUnread = notifs.some(function(n){ return !n.read; });
  if (hdr) hdr.style.display = (notifs.length && hasUnread) ? 'flex' : 'none';
  if (!notifs.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = notifs.map(function(n, i) {
    const type = n.type || 'system';
    const ico  = _NOTIF_ICONS[type] || '🔔';
    return '<div class="ppu-notif-item ' + (n.read ? 'read' : 'unread') + '" onclick="event.stopPropagation();markNotifRead(' + i + ')">'
      + '<div class="ppu-ni-ico t-' + type + '">' + ico + '</div>'
      + '<div class="ppu-notif-item-body">'
      + '<div class="ppu-notif-item-text">' + n.text.replace(/</g,'&lt;') + '</div>'
      + '<div class="ppu-notif-item-time">' + _notifTimeAgo(n.ts) + '</div>'
      + '</div>'
      + '<button class="ppu-ni-del" onclick="event.stopPropagation();deleteNotif(' + n.id + ')" title="Удалить">×</button>'
      + '</div>';
  }).join('');
}

function markNotifRead(idx) {
  const notifs = _loadNotifs();
  if (notifs[idx]) { notifs[idx].read = true; _saveNotifs(notifs); }
  renderNotifList();
  renderNotifBadge();
}

function markAllNotifsRead() {
  const notifs = _loadNotifs();
  notifs.forEach(function(n) { n.read = true; });
  _saveNotifs(notifs);
  renderNotifList();
  renderNotifBadge();
}

function deleteNotif(id) {
  const notifs = _loadNotifs().filter(function(n){ return n.id !== id; });
  _saveNotifs(notifs);
  renderNotifList();
  renderNotifBadge();
}

function toggleNotifPanel() {
  _notifPanelOpen = !_notifPanelOpen;
  const panel   = document.getElementById('ppu-notif-panel');
  const chevron = document.getElementById('ppu-notif-chevron');
  if (panel)   panel.classList.toggle('open', _notifPanelOpen);
  if (chevron) chevron.classList.toggle('open', _notifPanelOpen);
  if (_notifPanelOpen) {
    renderNotifList();
    setTimeout(markAllNotifsRead, 1500);
  }
}

// In-app toast for new notification
function _showNotifToast(n) {
  const type = n.type || 'system';
  const toast = document.getElementById('notif-toast');
  const ico   = document.getElementById('notif-toast-ico');
  const txt   = document.getElementById('notif-toast-text');
  const title = toast && toast.querySelector('.notif-toast-title');
  if (!toast) return;
  if (ico)   ico.textContent   = _NOTIF_ICONS[type] || '🔔';
  if (title) title.textContent = _NOTIF_TITLES[type] || 'Уведомление';
  if (txt)   txt.textContent   = n.text;
  toast.classList.add('show');
  if (_notifToastTimer) clearTimeout(_notifToastTimer);
  _notifToastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 4500);
}

function openNotifFromToast() {
  const toast = document.getElementById('notif-toast');
  if (toast) toast.classList.remove('show');
  // Open the home popup to notifications section
  if (typeof openAvPopup === 'function') openAvPopup();
  setTimeout(function(){
    const toggle = document.getElementById('ppu-notif-toggle');
    if (toggle && !_notifPanelOpen) toggle.click();
  }, 200);
}

// Efficient poll — sends lastId so server returns only newer notifs
function _pollNotifs() {
  if (!UID) return;
  const url = '/api/notifications?uid=' + UID + (_notifLastId ? '&lastId=' + _notifLastId : '');
  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (!d.notifications || !d.notifications.length) return;
      const saved    = _loadNotifs();
      const savedIds = new Set(saved.map(function(n){ return n.id; }));
      let latestNew  = null;
      d.notifications.forEach(function(n) {
        if (!savedIds.has(n.id)) {
          saved.unshift({ id: n.id, type: n.type || 'system', text: n.text, ts: n.ts, read: false });
          if (!latestNew || n.id > latestNew.id) latestNew = n;
        }
        if (n.id > _notifLastId) _notifLastId = n.id;
      });
      _saveNotifs(saved.slice(0, 50));
      renderNotifBadge();
      if (latestNew) _showNotifToast(latestNew);
      if (_notifPanelOpen) renderNotifList();
    })
    .catch(function(){});
}

// Init on load
document.addEventListener('DOMContentLoaded', function() {
  // Set lastId from saved notifs so we only fetch truly new ones
  const existing = _loadNotifs();
  if (existing.length) _notifLastId = Math.max.apply(null, existing.map(function(n){ return n.id || 0; }));
  renderNotifBadge();
  _pollNotifs();
  setInterval(_pollNotifs, 25000);
});
