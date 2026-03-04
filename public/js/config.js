/* ══ INVENTORY DEFS ══ */
const INV_DEF={
  gift:{ico:'🎁',name:'Подарок',desc:'Открой и получи от 100 до 500 монет',action:'openGift'},
  crystal:{ico:'💎',name:'Кристалл',desc:'Накопи 10 и получи скидку 50% на VIP 7 дней',action:'usecrystal'},
  bonus3:{ico:'⚡',name:'Бонус х3',desc:'Следующий денежный приз из кейса умножается на 3 (1 раз)',action:'activateBonus3'},
  bonus5:{ico:'🔥',name:'Бонус х5',desc:'Следующий денежный приз из кейса умножается на 5 (1 раз)',action:'activateBonus5'},
  ticket:{ico:'🎟️',name:'Билет',desc:'Используй для участия в розыгрышах требующих билеты',action:'useTicket'},
  super:{ico:'🌟',name:'Супер',desc:'Смени цвет ника бесплатно (1 раз)',action:'useSuper'},
  crown:{ico:'👑',name:'Корона',desc:'Надень корону на аватарку — навсегда',action:'wearCrown'},
  legend:{ico:'✨',name:'Легенда',desc:'Свечение вокруг аватарки на 14 дней — выбери цвет',action:'activateLegendItem'},
  megagift:{ico:'🎁',name:'Мега-подарок',desc:'Крути мега-рулетку: VIP 7д, Билеты х10, Корона, Кейс Золотой',action:'openMegaGift'},
};

/* ══ CASES ══ */
const CASES=[
  {id:1,name:'Стартовый',price:50,bg:'linear-gradient(145deg,#0d1f14,#122010)',ic:'#2ecc71',ib:'rgba(46,204,113,.15)',
   icon:`<svg viewBox="0 0 24 24" stroke="#2ecc71" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
   drops:[{i:'🪙',n:'Монеты',v:'+50',coins:50},{i:'🎁',n:'Подарок',v:'х1',inv:'gift',cnt:1},{i:'⚡',n:'Бонус',v:'х3',inv:'bonus3',cnt:1},{i:'💎',n:'Кристалл',v:'х1',inv:'crystal',cnt:1},{i:'🪙',n:'Монеты',v:'+100',coins:100},{i:'🎟️',n:'Билет',v:'х1',inv:'ticket',cnt:1},{i:'🏆',n:'VIP',v:'1 день',vipDays:1},{i:'🪙',n:'Монеты',v:'+30',coins:30}]},
  {id:2,name:'Обычный',price:150,bg:'linear-gradient(145deg,#0d1428,#101828)',ic:'#5B8DEF',ib:'rgba(91,141,239,.15)',
   icon:`<svg viewBox="0 0 24 24" stroke="#5B8DEF" fill="none"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
   drops:[{i:'💰',n:'Монеты',v:'+200',coins:200},{i:'🎁',n:'Подарок',v:'х2',inv:'gift',cnt:2},{i:'💎',n:'Кристалл',v:'х2',inv:'crystal',cnt:2},{i:'🏆',n:'VIP',v:'3 дня',vipDays:3},{i:'⭐',n:'Монеты',v:'+100',coins:100},{i:'🎟️',n:'Билет',v:'х3',inv:'ticket',cnt:3},{i:'🌟',n:'Супер',v:'х1',inv:'super',cnt:1},{i:'💰',n:'Монеты',v:'+150',coins:150}]},
  {id:3,name:'Золотой',price:500,bg:'linear-gradient(145deg,#1a1500,#1e1800)',ic:'#F4C430',ib:'rgba(244,196,48,.15)',
   icon:`<svg viewBox="0 0 24 24" stroke="#F4C430" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
   drops:[{i:'💰',n:'Монеты',v:'+1000',coins:1000},{i:'🏆',n:'VIP',v:'7 дней',vipDays:7},{i:'💎',n:'Кристалл',v:'х5',inv:'crystal',cnt:5},{i:'🎁',n:'Подарок',v:'х5',inv:'gift',cnt:5},{i:'🌟',n:'Супер',v:'х1',inv:'super',cnt:1},{i:'👑',n:'Корона',v:'навсегда',inv:'crown',cnt:1},{i:'💰',n:'Монеты',v:'+2000',coins:2000},{i:'🔥',n:'Бонус',v:'х5',inv:'bonus5',cnt:1}]},
  {id:4,name:'Премиум',price:1000,bg:'linear-gradient(145deg,#200a0a,#1a0808)',ic:'#FF4D4D',ib:'rgba(255,77,77,.15)',
   icon:`<svg viewBox="0 0 24 24" stroke="#FF4D4D" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/><circle cx="12" cy="12" r="3"/></svg>`,
   drops:[{i:'👑',n:'Корона',v:'навсегда',inv:'crown',cnt:1},{i:'💰',n:'Монеты',v:'+5000',coins:5000},{i:'🏆',n:'VIP',v:'30 дней',vipDays:30},{i:'✨',n:'Легенда',v:'14 дней',inv:'legend',cnt:1},{i:'🌟',n:'Супер',v:'х1',inv:'super',cnt:1},{i:'🎁',n:'Мега-подарок',v:'х1',inv:'megagift',cnt:1},{i:'💰',n:'Монеты',v:'+10000',coins:10000},{i:'🏆',n:'VIP',v:'7 дней',vipDays:7}]},
  {id:5,name:'Звёздный ⭐',starsPrice:99,wip:true,bg:'linear-gradient(145deg,#1a1500,#201a00)',ic:'#FFD700',ib:'rgba(255,215,0,.15)',
   icon:`<svg viewBox="0 0 24 24" stroke="#FFD700" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
   drops:[]},
];

/* ══ SHOP ITEMS ══ */
const ITEMS=[
  {id:2,ico:'💎',name:'Кристалл удачи',price:300,wip:false},
  {id:3,ico:'🏆',name:'VIP на 7 дней',price:500,wip:false,vipDays:7},
  {id:7,ico:'👑',name:'VIP на 30 дней',price:1500,wip:false,vipDays:30},
  {id:4,ico:'🎰',name:'Доп. попытка',price:200,wip:true},
  {id:5,ico:'🌈',name:'Цветной ник',price:250,wip:false,special:'color'},
  {id:6,ico:'✨',name:'Буст рефералов',price:400,wip:true},
];

/* ══ TASKS ══ */
const TASKS=[
  {id:1,ico:'📢',tag:'Канал',tc:'r',name:'Подписаться на канал',desc:'Подпишись на @broketalking',rew:100,url:'https://t.me/broketalking',check:'sub',channel:'broketalking'},
  {id:2,ico:'💬',tag:'Задание',tc:'r',name:'Написать в чат',desc:'Напиши любое слово в @drainself',rew:50,url:'https://t.me/drainself',check:'chat',channel:'drainself'},
  {id:4,ico:'👥',tag:'Друзья',tc:'g',name:'Пригласить первого друга',desc:'Пригласи по реф-ссылке',rew:1000,check:'ref'},
  {id:6,ico:'📦',tag:'Задание',tc:'r',name:'Открыть первый кейс',desc:'Открой любой кейс в Магазине',rew:200,check:'case'},
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
