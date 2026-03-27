export const INV_DEF = {
  megagift: { ico: '🎁', name: 'Мега-подарок', desc: 'Крути мега-рулетку: VIP 7д, Билеты х10, Корона, Кейс Богача', action: 'openMegaGift' },
  gift:     { ico: '🎁', name: 'Подарок',       desc: 'Получи 100–500 монет',                                          action: 'openGift' },
  crystal:  { ico: '💎', name: 'Кристалл',      desc: '10 кристаллов = скидка 50% на VIP',                           action: 'usecrystal' },
  bonus3:   { ico: '⚡', name: 'Бонус ×3',      desc: 'Следующий приз в кейсе ×3',                                   action: 'activateBonus3' },
  bonus5:   { ico: '🔥', name: 'Бонус ×5',      desc: 'Следующий приз в кейсе ×5',                                   action: 'activateBonus5' },
  ticket:   { ico: '🎟️', name: 'Билет',         desc: 'Для участия в платных розыгрышах',                            action: 'useTicket' },
  super:    { ico: '🌟', name: 'Супер',          desc: 'Смени цвет ника 1 раз бесплатно',                             action: 'useSuper' },
  crown:    { ico: '👑', name: 'Корона',         desc: 'Надень корону на аватарку',                                   action: 'wearCrown' },
  legend:   { ico: '✨', name: 'Легенда',        desc: 'Свечение вокруг аватарки 14 дней',                            action: 'activateLegendItem' },
};

export const DROP_ICONS = {
  coins:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`,
  vip:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/></svg>`,
  megagift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`,
};

export const CASES = [
  { id: 1, name: 'Нищий Кейс',      price: 1111, bg: 'linear-gradient(145deg,#0d1f14,#122010)', ic: '#2ecc71', ib: 'rgba(46,204,113,.15)',  photo: 'https://i.imgur.com/N6vjFz8.jpeg', drops: [{ icoKey: 'coins', n: 'Монеты', v: '+100',  coins: 100  }, { icoKey: 'coins', n: 'Монеты', v: '+150',  coins: 150  }, { icoKey: 'coins', n: 'Монеты', v: '+80',   coins: 80   }, { icoKey: 'coins', n: 'Монеты', v: '+300',  coins: 300  }, { icoKey: 'coins', n: 'Монеты', v: '+450',  coins: 450  }, { icoKey: 'coins', n: 'Монеты', v: '+2000', coins: 2000 }] },
  { id: 2, name: 'Средний Кейс',     price: 3333, bg: 'linear-gradient(145deg,#0d1428,#101828)', ic: '#5B8DEF', ib: 'rgba(91,141,239,.15)',  photo: 'https://i.imgur.com/hxTvBaf.jpeg', drops: [{ icoKey: 'coins', n: 'Монеты', v: '+350',  coins: 350  }, { icoKey: 'coins', n: 'Монеты', v: '+250',  coins: 250  }, { icoKey: 'coins', n: 'Монеты', v: '+300',  coins: 300  }, { icoKey: 'coins', n: 'Монеты', v: '+555',  coins: 555  }, { icoKey: 'coins', n: 'Монеты', v: '+888',  coins: 888  }, { icoKey: 'coins', n: 'Монеты', v: '+3500', coins: 3500 }] },
  { id: 3, name: 'Кейс Богача',      price: 5555, bg: 'linear-gradient(145deg,#1a1500,#1e1800)', ic: '#F4C430', ib: 'rgba(244,196,48,.15)',  photo: 'https://i.imgur.com/dpfHwkG.jpeg', photoPos: 'center 25%', drops: [{ icoKey: 'coins', n: 'Монеты', v: '+1500', coins: 1500 }, { icoKey: 'coins', n: 'Монеты', v: '+2222', coins: 2222 }, { icoKey: 'coins', n: 'Монеты', v: '+999',  coins: 999  }, { icoKey: 'coins', n: 'Монеты', v: '+1111', coins: 1111 }, { icoKey: 'coins', n: 'Монеты', v: '+7777', coins: 7777 }] },
  { id: 4, name: 'Кейс Миллионера', price: 7777, bg: 'linear-gradient(145deg,#200a0a,#1a0808)', ic: '#FF4D4D', ib: 'rgba(255,77,77,.15)',   photo: 'https://i.imgur.com/3iI3Gpq.jpeg', drops: [{ icoKey: 'megagift', n: 'Мега-подарок', v: 'х1', inv: 'megagift', cnt: 1 }, { icoKey: 'coins', n: 'Монеты', v: '+1000', coins: 1000 }, { icoKey: 'coins', n: 'Монеты', v: '+2000', coins: 2000 }, { icoKey: 'coins', n: 'Монеты', v: '+2500', coins: 2500 }, { icoKey: 'coins', n: 'Монеты', v: '+9999', coins: 9999 }, { icoKey: 'coins', n: 'Монеты', v: '+11111', coins: 11111 }, { icoKey: 'coins', n: 'Монеты', v: '+25000', coins: 25000, rare: true }] },
  { id: 5, name: 'Звёздный ⭐',       starsPrice: 99, wip: true, bg: 'linear-gradient(145deg,#1a1500,#201a00)', ic: '#FFD700', ib: 'rgba(255,215,0,.15)', photo: '', drops: [] },
];

export const ITEMS = [
  { id: 3, icoKey: 'vip7',   name: 'VIP на 7 дней',  price: 3333, vipDays: 7,   imageUrl: 'https://i.imgur.com/cMSB019.jpg' },
  { id: 7, icoKey: 'vip30',  name: 'VIP на 30 дней', price: 9999, vipDays: 30,  imageUrl: 'https://i.imgur.com/2bXKYI7.jpg' },
  { id: 9, icoKey: 'crown3', name: 'Корона на 3 дня', price: 1199, crownDays: 3, imageUrl: 'https://i.imgur.com/IDK9foe.jpg' },
  { id: 5, icoKey: 'color',  name: 'Цветной ник',    price: 999,  special: 'color',  imageUrl: 'https://i.imgur.com/9CX7f2s.jpg' },
  { id: 8, icoKey: 'effect', name: 'Эффект входа',   price: 5000, special: 'effect', imageUrl: 'https://i.imgur.com/HGwC5BJ.jpg' },
];

export const TASKS = [
  { id: 1, icoKey: 'sub',    tag: 'Подписка', tc: 'g',  name: 'Подписаться на канал',     desc: 'Подпишись на @broketalking и включи уведомления!',              rew: 100,  url: 'https://t.me/broketalking', check: 'sub', channel: 'broketalking' },
  { id: 4, icoKey: 'ref',    tag: 'Друзья',   tc: 'fr', name: 'Пригласить первого друга', desc: 'Пригласи друга по своей реф-ссылке и получи монеты!',            rew: 1000, check: 'ref' },
  { id: 6, icoKey: 'case',   tag: 'Задание',  tc: 'o',  name: 'Открыть первый кейс',      desc: 'Открой любой кейс в разделе Магазин → Кейсы!',                 rew: 200,  check: 'case' },
  { id: 7, icoKey: 'wallet', tag: 'Кошелёк',  tc: 'b',  name: 'Подключить TON кошелёк',   desc: 'Подключи кошелёк в разделе Профиль и получи монеты!',            rew: 2000, check: 'wallet' },
];

export const COLORS = [
  { id: 'nc-purple', label: 'Фиолетовый', grad: 'linear-gradient(135deg,#bf5af2,#e040fb,#da8fff)', tc: '#bf5af2' },
  { id: 'nc-gold',   label: 'Золотой',    grad: 'linear-gradient(135deg,#f4c430,#ffab00,#f39c12)', tc: '#f4c430' },
  { id: 'nc-red',    label: 'Красный',    grad: 'linear-gradient(135deg,#ff6060,#ff2d2d,#ff4444)', tc: '#ff4444' },
  { id: 'nc-blue',   label: 'Синий',      grad: 'linear-gradient(135deg,#5b8def,#4a7adc,#3a5bbe)', tc: '#5b8def' },
  { id: 'nc-pink',   label: 'Розовый',    grad: 'linear-gradient(135deg,#ff6fb7,#ff4daa,#ff2299)', tc: '#ff4daa' },
  { id: 'nc-cyan',   label: 'Голубой',    grad: 'linear-gradient(135deg,#00e5ff,#00b4d8,#0077b6)', tc: '#00e5ff' },
  { id: '',          label: 'Стандартный', grad: 'linear-gradient(135deg,#fff,#2ecc71)',            tc: '#2ecc71' },
];

export const LEGEND_COLORS = ['#2ecc71', '#bf5af2', '#f4c430', '#ff6060', '#5b8def', '#ff6fb7', '#00e5ff', '#ff7f00'];

export const ITEM_ICONS = {
  vip7:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/></svg>`,
  vip30:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/><circle cx="19" cy="4" r="2" fill="currentColor" stroke="none"/></svg>`,
  crown3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 19h20M3 9l4 5 5-8 5 8 4-5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/></svg>`,
  color:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  effect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

export const TASK_ICONS = {
  sub:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
  chat:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  ref:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  case:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1" fill="currentColor"/></svg>`,
};
