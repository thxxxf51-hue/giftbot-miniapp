/* ══════════════════════════════════════════════════════════
   LANG.JS — Переводы + Темы + Попап аватарки
══════════════════════════════════════════════════════════ */

const TRANSLATIONS = {
  ru: {
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
    'nav-home':         'Главная',
    'nav-tasks':        'Задания',
    'nav-shop':         'Магазин',
    'nav-pvp':          'PvP',
    'nav-profile':      'Профиль',
    'title-tasks':      'Задания',
    'title-shop':       'Магазин',
    'title-inventory':  'Инвентарь',
    'title-raffles':    'Розыгрыши',
    'title-friends':    'Рефералы',
    'title-profile':    'Профиль',
    'title-pvp':        'ПвП',
    'shop-tab-items':   '🛒 Магазин',
    'shop-tab-cases':   '📦 Кейсы',
    'raf-tab-active':   '🎁 Активные',
    'raf-tab-done':     '🏆 Завершённые',
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
    'ref-lbl':          'Реферальная ссылка',
    'ref-desc':         'За каждого приглашённого вы получаете',
    'ref-share':        'Поделиться в Telegram',
    'ref-c1-lbl':       'Лично приглашённые',
    'ref-c1-sub':       '+1000 за каждого',
    'ref-c2-lbl':       '2-й уровень',
    'ref-c2-sub':       'Скоро',
    'ref-earn-lbl':     'Заработано',
    'ref-sec':          'Ваши рефералы',
    'promo-ph':         'Введите промокод',
    'promo-btn':        'Применить',
    'popup-dark':       'Тёмная',
    'popup-light':      'Светлая',
    'pvp-mode-hint':    'Выбери режим игры',
  },
  en: {
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
    'nav-home':         'Home',
    'nav-tasks':        'Tasks',
    'nav-shop':         'Shop',
    'nav-pvp':          'PvP',
    'nav-profile':      'Profile',
    'title-tasks':      'Tasks',
    'title-shop':       'Shop',
    'title-inventory':  'Inventory',
    'title-raffles':    'Raffles',
    'title-friends':    'Referrals',
    'title-profile':    'Profile',
    'title-pvp':        'PvP',
    'shop-tab-items':   '🛒 Shop',
    'shop-tab-cases':   '📦 Cases',
    'raf-tab-active':   '🎁 Active',
    'raf-tab-done':     '🏆 Finished',
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
    'ref-lbl':          'Referral link',
    'ref-desc':         'You earn for each invited friend',
    'ref-share':        'Share in Telegram',
    'ref-c1-lbl':       'Direct referrals',
    'ref-c1-sub':       '+1000 each',
    'ref-c2-lbl':       '2nd level',
    'ref-c2-sub':       'Coming soon',
    'ref-earn-lbl':     'Earned',
    'ref-sec':          'Your referrals',
    'promo-ph':         'Enter promo code',
    'promo-btn':        'Apply',
    'popup-dark':       'Dark',
    'popup-light':      'Light',
    'pvp-mode-hint':    'Choose game mode',
  }
};

/* ── Сохранённые настройки ── */
let _lang  = localStorage.getItem('gb_lang')  || 'ru';
let _theme = localStorage.getItem('gb_theme') || 'dark';

/* ════════════════════════════════
   APPLY LANGUAGE
════════════════════════════════ */
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

/* ════════════════════════════════
   APPLY THEME
════════════════════════════════ */
function applyTheme(theme) {
  _theme = theme;
  localStorage.setItem('gb_theme', theme);
  document.body.classList.toggle('theme-light', theme === 'light');

  const btnDark  = document.getElementById('popup-btn-dark');
  const btnLight = document.getElementById('popup-btn-light');
  if (btnDark)  btnDark.classList.toggle('ppu-active', theme === 'dark');
  if (btnLight) btnLight.classList.toggle('ppu-active', theme === 'light');
}

/* ════════════════════════════════
   POPUP
════════════════════════════════ */
let _popupOpen = false;

function toggleAvPopup() {
  _popupOpen ? closeAvPopup() : openAvPopup();
}
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

/* ════════════════════════════════
   INIT
════════════════════════════════ */
function _initLangTheme() {
  applyTheme(_theme);
  applyLang(_lang);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initLangTheme);
} else {
  _initLangTheme();
}
