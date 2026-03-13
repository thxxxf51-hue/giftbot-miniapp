/* ══ INVENTORY DEFS ══ */
const INV_DEF={
  gift:{ico:'🎁',name:'Подарок',desc:'Открой и получи от 100 до 500 монет',action:'openGift'},
  crystal:{ico:'💎',name:'Кристалл',desc:'Накопи 10 и получи скидку 50% на VIP 7 дней',action:'usecrystal'},
  bonus3:{ico:'⚡',name:'Бонус х3',desc:'Следующий денежный приз из кейса умножается на 3 (1 раз)',action:'activateBonus3'},
  bonus5:{ico:'🔥',name:'Бонус х5',desc:'Следующий денежный приз из кейса умножается на 5 (1 раз)',action:'activateBonus5'},
  ticket:{ico:'🎟️',name:'Билет',desc:'Используй для участия в розыгрышах требующих билеты',action:'useTicket'},
  super:{ico:'🌟',name:'Супер',desc:'Смени цвет ника бесплатно (1 раз)',action:'useSuper'},
  crown:{ico:'👑',name:'Корона',desc:'Надень корону или обменяй за 777 🪙',action:'wearCrown'},
  legend:{ico:'✨',name:'Легенда',desc:'Активируй свечение или обменяй за 333 🪙',action:'activateLegendItem'},
  megagift:{ico:'🎁',name:'Мега-подарок',desc:'Крути мега-рулетку: VIP 7д, Билеты х10, Корона, Кейс Богача',action:'openMegaGift'},
};

/* ══ CASES ══ */

/* SVG иконки для призов (используются в рулетке и превью) */
const DROP_ICONS={
  coins:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`,
  gift:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`,
  bonus:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  crystal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M6 3l4 6M18 3l-4 6M12 3l2 6M10 9L12 22M14 9l-2 13"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 000 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 000-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z"/><line x1="9" y1="12" x2="15" y2="12" stroke-dasharray="2 2"/></svg>`,
  vip:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/></svg>`,
  super:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  crown:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 19h20M3 9l4 5 5-8 5 8 4-5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/></svg>`,
  legend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5L12 3z"/><path d="M5 20h14M8 17h8"/></svg>`,
  megagift:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/><circle cx="12" cy="4" r="1" fill="currentColor"/></svg>`,
};

const CASES=[
  {id:1,name:'Нищий Кейс',price:1111,bg:'linear-gradient(145deg,#0d1f14,#122010)',ic:'#2ecc71',ib:'rgba(46,204,113,.15)',
   photo:'https://i.imgur.com/N6vjFz8.jpeg',
   drops:[
     {icoKey:'coins',n:'Монеты',v:'+100',coins:100},
     {icoKey:'gift',n:'Подарок',v:'х1',inv:'gift',cnt:1},
     {icoKey:'bonus',n:'Бонус',v:'х3',inv:'bonus3',cnt:1},
     {icoKey:'crystal',n:'Кристалл',v:'х1',inv:'crystal',cnt:1},
     {icoKey:'coins',n:'Монеты',v:'+150',coins:150},
     {icoKey:'ticket',n:'Билет',v:'х1',inv:'ticket',cnt:1},
     {icoKey:'vip',n:'VIP',v:'1 день',vipDays:1},
     {icoKey:'coins',n:'Монеты',v:'+80',coins:80},
     {icoKey:'coins',n:'Монеты',v:'+300',coins:300},
     {icoKey:'coins',n:'Монеты',v:'+450',coins:450},
     {icoKey:'coins',n:'Монеты',v:'+2000',coins:2000},
   ]},
  {id:2,name:'Средний Кейс',price:3333,bg:'linear-gradient(145deg,#0d1428,#101828)',ic:'#5B8DEF',ib:'rgba(91,141,239,.15)',
   photo:'https://i.imgur.com/hxTvBaf.jpeg',
   drops:[
     {icoKey:'coins',n:'Монеты',v:'+350',coins:350},
     {icoKey:'gift',n:'Подарок',v:'х2',inv:'gift',cnt:2},
     {icoKey:'crystal',n:'Кристалл',v:'х2',inv:'crystal',cnt:2},
     {icoKey:'vip',n:'VIP',v:'3 дня',vipDays:3},
     {icoKey:'coins',n:'Монеты',v:'+250',coins:250},
     {icoKey:'ticket',n:'Билет',v:'х3',inv:'ticket',cnt:3},
     {icoKey:'super',n:'Супер',v:'х1',inv:'super',cnt:1},
     {icoKey:'coins',n:'Монеты',v:'+300',coins:300},
     {icoKey:'coins',n:'Монеты',v:'+555',coins:555},
     {icoKey:'coins',n:'Монеты',v:'+888',coins:888},
     {icoKey:'coins',n:'Монеты',v:'+3500',coins:3500},
   ]},
  {id:3,name:'Кейс Богача',price:5555,bg:'linear-gradient(145deg,#1a1500,#1e1800)',ic:'#F4C430',ib:'rgba(244,196,48,.15)',
   photo:'https://i.imgur.com/dpfHwkG.jpeg',photoPos:'center 45%',
   drops:[
     {icoKey:'coins',n:'Монеты',v:'+1500',coins:1500},
     {icoKey:'vip',n:'VIP',v:'7 дней',vipDays:7},
     {icoKey:'crystal',n:'Кристалл',v:'х5',inv:'crystal',cnt:5},
     {icoKey:'gift',n:'Подарок',v:'х5',inv:'gift',cnt:5},
     {icoKey:'super',n:'Супер',v:'х1',inv:'super',cnt:1},
     {icoKey:'crown',n:'Корона',v:'х1',inv:'crown',cnt:1},
     {icoKey:'coins',n:'Монеты',v:'+2222',coins:2222},
     {icoKey:'bonus',n:'Бонус',v:'х5',inv:'bonus5',cnt:1},
     {icoKey:'coins',n:'Монеты',v:'+999',coins:999},
     {icoKey:'coins',n:'Монеты',v:'+1111',coins:1111},
     {icoKey:'coins',n:'Монеты',v:'+7777',coins:7777},
   ]},
  {id:4,name:'Кейс Миллионера',price:7777,bg:'linear-gradient(145deg,#200a0a,#1a0808)',ic:'#FF4D4D',ib:'rgba(255,77,77,.15)',
   photo:'https://i.imgur.com/3iI3Gpq.jpeg',
   drops:[
     {icoKey:'crown',n:'Корона',v:'х1',inv:'crown',cnt:1},
     {icoKey:'coins',n:'Монеты',v:'+1000',coins:1000},
     {icoKey:'vip',n:'VIP',v:'7 дней',vipDays:7},
     {icoKey:'legend',n:'Легенда',v:'х1',inv:'legend',cnt:1},
     {icoKey:'super',n:'Супер',v:'х1',inv:'super',cnt:1},
     {icoKey:'megagift',n:'Мега-подарок',v:'х1',inv:'megagift',cnt:1},
     {icoKey:'vip',n:'VIP',v:'3 дня',vipDays:3},
     {icoKey:'coins',n:'Монеты',v:'+2000',coins:2000},
     {icoKey:'coins',n:'Монеты',v:'+2500',coins:2500},
     {icoKey:'coins',n:'Монеты',v:'+9999',coins:9999},
     {icoKey:'coins',n:'Монеты',v:'+11111',coins:11111},
     {icoKey:'coins',n:'Монеты',v:'+25000',coins:25000,rare:true},
   ]},
  {id:5,name:'Звёздный ⭐',starsPrice:99,wip:true,bg:'linear-gradient(145deg,#1a1500,#201a00)',ic:'#FFD700',ib:'rgba(255,215,0,.15)',
   photo:'',
   drops:[]},
];

/* ══ SHOP ITEMS ══ */
/* SVG иконки товаров магазина */
const ITEM_ICONS={
  vip7:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/></svg>`,
  vip30:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 10v4M12 10v4M17 10v4M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2"/><line x1="2" y1="14" x2="22" y2="14"/><circle cx="19" cy="4" r="2" fill="currentColor" stroke="none"/></svg>`,
  crown3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 19h20M3 9l4 5 5-8 5 8 4-5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/></svg>`,
  color:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  effect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

const ITEMS=[
  {id:3,icoKey:'vip7',  name:'VIP на 7 дней', price:500, wip:false,vipDays:7},
  {id:7,icoKey:'vip30', name:'VIP на 30 дней',price:1500,wip:false,vipDays:30},
  {id:9,icoKey:'crown3',name:'Корона на 3 дня',price:777, wip:false,crownDays:3},
  {id:5,icoKey:'color', name:'Цветной ник',   price:250, wip:false,special:'color'},
  {id:8,icoKey:'effect',name:'Эффект входа',  price:2500,wip:false,special:'effect'},
];

/* ══ TASKS ══ */
const TASK_ICONS = {
  sub:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.62 19.79 19.79 0 01.5 2.18 2 2 0 012.48.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.34a16 16 0 006.75 6.75l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
  chat:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  ref:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  case:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1" fill="currentColor"/></svg>`,
};

const TASKS=[
  {id:1, icoKey:'sub',    tag:'Канал',   tc:'r', name:'Подписаться на канал',     desc:'Подпишись на @broketalking',          rew:100,  url:'https://t.me/broketalking', check:'sub',    channel:'broketalking'},
  {id:2, icoKey:'chat',   tag:'Задание', tc:'r', name:'Написать в чат',           desc:'Напиши любое слово в @drainself',     rew:50,   url:'https://t.me/drainself',    check:'chat',   channel:'drainself', wip:true},
  {id:4, icoKey:'ref',    tag:'Друзья',  tc:'g', name:'Пригласить первого друга', desc:'Пригласи по реф-ссылке',              rew:1000,                                  check:'ref'},
  {id:6, icoKey:'case',   tag:'Задание', tc:'r', name:'Открыть первый кейс',      desc:'Открой любой кейс в Магазине',        rew:200,                                   check:'case'},
  {id:7, icoKey:'wallet', tag:'Кошелёк', tc:'b', name:'Подключить TON кошелёк',   desc:'Подключи TonKeeper или Telegram Wallet', rew:2000,                               check:'wallet'},
];

/* ══ NICK COLORS ══ */
const COLORS=[
  {id:'nc-purple',label:'Фиолетовый',grad:'linear-gradient(135deg,#bf5af2,#e040fb,#da8fff)',tc:'#bf5af2'},
  {id:'nc-gold',  label:'Золотой',   grad:'linear-gradient(135deg,#f4c430,#ffab00,#f39c12)',tc:'#f4c430'},
  {id:'nc-red',   label:'Красный',   grad:'linear-gradient(135deg,#ff6060,#ff2d2d,#ff4444)',tc:'#ff4444'},
  {id:'nc-blue',  label:'Синий',     grad:'linear-gradient(135deg,#5b8def,#4a7adc,#3a5bbe)',tc:'#5b8def'},
  {id:'nc-pink',  label:'Розовый',   grad:'linear-gradient(135deg,#ff6fb7,#ff4daa,#ff2299)',tc:'#ff4daa'},
  {id:'nc-cyan',  label:'Голубой',   grad:'linear-gradient(135deg,#00e5ff,#00b4d8,#0077b6)',tc:'#00e5ff'},
  {id:'',         label:'Стандартный',grad:'linear-gradient(135deg,#fff,#2ecc71)',tc:'#2ecc71'},
];

const LEGEND_COLORS=['#2ecc71','#bf5af2','#f4c430','#ff6060','#5b8def','#ff6fb7','#00e5ff','#ff7f00'];
