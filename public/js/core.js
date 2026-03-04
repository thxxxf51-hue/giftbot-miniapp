/* ══ TELEGRAM ══ */
const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();try{tg.setHeaderColor('#0a0a0a');tg.setBackgroundColor('#0a0a0a');}catch(e){}}
const TGU=tg?.initDataUnsafe?.user||{id:123456,first_name:'ik',username:'assate',photo_url:null};
const UID=String(TGU.id);

/* ══ STORAGE ══ */
const SK='gb4_'+UID;
function load(){try{const d=JSON.parse(localStorage.getItem(SK)||'{}');return d.v===5?d:null;}catch{return null;}}
function save(){try{localStorage.setItem(SK,JSON.stringify({v:5,balance:S.balance,starsBalance:S.starsBalance,doneTasks:[...S.doneTasks],usedPromos:[...S.usedPromos],regDate:S.regDate,refs:S.refs,refEarned:S.refEarned,refBy:S.refBy,vipExpiry:S.vipExpiry,nickColor:S.nickColor,hasCrown:S.hasCrown,legendExpiry:S.legendExpiry,legendColor:S.legendColor,inventory:S.inventory,bonusMulti:S.bonusMulti,vipDiscount:S.vipDiscount,task3refsDone:S.task3refsDone}));}catch{}}

const sv=load();
const today=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});

const S={
  balance:sv?.balance??1000,
  starsBalance:sv?.starsBalance??0,
  doneTasks:new Set(sv?.doneTasks||[]),
  usedPromos:new Set(sv?.usedPromos||[]),
  regDate:sv?.regDate||today,
  refs:sv?.refs||[],
  refEarned:sv?.refEarned||0,
  refBy:sv?.refBy||null,
  vipExpiry:sv?.vipExpiry||null,
  nickColor:sv?.nickColor||'',
  hasCrown:sv?.hasCrown||false,
  legendExpiry:sv?.legendExpiry||null,
  legendColor:sv?.legendColor||'#2ecc71',
  inventory:sv?.inventory||{},
  bonusMulti:sv?.bonusMulti||0,
  vipDiscount:sv?.vipDiscount||false,
  task3refsDone:sv?.task3refsDone||false,
};

/* ══ REF PARAM ══ */
(function(){
  try{
    const sp=tg?.initDataUnsafe?.start_param||'';
    if(!sp.startsWith('ref_'))return;
    const rUID=sp.replace('ref_','');
    if(rUID===UID||S.refBy)return;
    S.refBy=rUID;
    const rk='gb4_'+rUID;
    const rd=JSON.parse(localStorage.getItem(rk)||'{}');
    if(!rd.refs)rd.refs=[];
    rd.refs.push({name:TGU.username?'@'+TGU.username:TGU.first_name,date:today});
    rd.balance=(rd.balance||1000)+1000;
    rd.refEarned=(rd.refEarned||0)+1000;
    if(rd.refs.length>=3&&!rd.task3refsDone){rd.balance+=2000;rd.task3refsDone=true;}
    rd.v=5;
    localStorage.setItem(rk,JSON.stringify(rd));
    save();
  }catch{}
})();

/* ══ SYNC ══ */
function syncB(){
  const b=S.balance.toLocaleString('ru');
  const sb=S.starsBalance;
  ['home','tasks','shop','inv','raffles','friends','profile'].forEach(k=>{const el=document.getElementById('b-'+k);if(el)el.textContent=b;});
  document.getElementById('p-bal').textContent=S.balance.toLocaleString('ru');
  const sbh=document.getElementById('b-stars-h');if(sbh)sbh.textContent=sb;
  const sbm=document.getElementById('sm-bal');if(sbm)sbm.textContent=sb;
  const pstar=document.getElementById('p-stars');if(pstar)pstar.textContent=sb+' ⭐';
  save();
  syncBalanceToServer();
}

let _bSyncTimer=null;
function syncBalanceToServer(){
  clearTimeout(_bSyncTimer);
  _bSyncTimer=setTimeout(async()=>{
    try{
      await fetch('/api/balance/update',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:UID,balance:S.balance,starsBalance:S.starsBalance})});
    }catch{}
  },1000);
}

/* ══ VIP ══ */
function vipStatus(){if(!S.vipExpiry)return'none';return Date.now()<S.vipExpiry?'active':'expired';}
function activateVip(days){const now=Date.now();S.vipExpiry=(S.vipExpiry&&S.vipExpiry>now?S.vipExpiry:now)+days*86400000;save();updateVipUI();}
function updateVipUI(){
  const el=document.getElementById('p-vip');if(!el)return;
  const st=vipStatus();
  if(st==='active'){const d=Math.ceil((S.vipExpiry-Date.now())/86400000);el.innerHTML=`<span class="vip-active">✅ VIP активен (${d} дн.)</span>`;}
  else if(st==='expired'){el.innerHTML=`<span class="vip-expired">⚠️ VIP истёк</span>`;}
  else{el.innerHTML=`<span class="vip-none">❌ VIP нет</span>`;}
}

/* ══ NICK COLOR ══ */
function applyNick(cid){
  S.nickColor=cid;save();
  const w=document.getElementById('h-name-wrap');
  if(w){w.className='uname '+(cid||'nc-default');}
  const pc=document.getElementById('p-color');
  const c=COLORS.find(x=>x.id===cid);
  if(pc)pc.textContent=c?c.label:'Стандартный';
  const pn=document.getElementById('p-name');
  if(pn&&cid){pn.style.background=c.grad;pn.style.webkitBackgroundClip='text';pn.style.webkitTextFillColor='transparent';pn.style.backgroundClip='text';}
  else if(pn){pn.style.background='';pn.style.webkitTextFillColor='';}
}

/* ══ CROWN ══ */
function applyCrown(){
  if(!S.hasCrown)return;
  document.getElementById('crown-h')?.classList.add('show');
  document.getElementById('crown-p')?.classList.add('show');
}

/* ══ LEGEND ══ */
function applyLegend(){
  if(!S.legendExpiry||Date.now()>S.legendExpiry)return;
  const col=S.legendColor;
  ['av-wrap-h','av-wrap-p'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.add('legend-glow');el.style.setProperty('--legend-color',col);}
  });
}

/* ══ INVENTORY ══ */
function addInv(key,cnt){S.inventory[key]=(S.inventory[key]||0)+cnt;save();}
function removeInv(key,cnt=1){S.inventory[key]=Math.max(0,(S.inventory[key]||0)-cnt);if(!S.inventory[key])delete S.inventory[key];save();}
function invCount(key){return S.inventory[key]||0;}

function renderInv(){
  const el=document.getElementById('inv-list');if(!el)return;
  const keys=Object.keys(S.inventory).filter(k=>S.inventory[k]>0);
  if(!keys.length){
    el.innerHTML=`<div class="inv-empty"><div class="inv-empty-ico">📦</div><div class="inv-empty-t">Инвентарь пуст</div><div class="inv-empty-s">Открывай кейсы чтобы получать предметы</div></div>`;
    return;
  }
  el.innerHTML=keys.map(k=>{
    const d=INV_DEF[k]||{ico:'❓',name:k,desc:'',action:''};
    return`<div class="gc inv-item" onclick="useInvItem('${k}')">
      <div class="inv-ico">${d.ico}</div>
      <div class="inv-info"><div class="inv-name">${d.name}</div><div class="inv-desc">${d.desc}</div></div>
      <div class="inv-cnt">×${S.inventory[k]}</div>
    </div>`;
  }).join('');
}

function useInvItem(key){
  const d=INV_DEF[key];if(!d)return;
  const cnt=invCount(key);if(!cnt)return;
  const a=d.action;
  if(a==='openGift'){
    const coins=Math.floor(Math.random()*401)+100;
    openGenMo('🎁 Открыть подарок',`Получи случайное количество монет (100–500)\nУ вас: ×${cnt}`,`🎁 Открыть`,()=>{
      removeInv('gift',1);S.balance+=coins;syncB();closeGenMo();
      toast(`🎁 Получено +${coins} монет!`,'g');renderInv();
    });
  } else if(a==='usecrystal'){
    const c=invCount('crystal');
    openGenMo('💎 Кристаллы скидки',`У вас ${c} кристаллов.\nПри наличии 10+ можно активировать скидку 50% на VIP 7 дней (будет стоить 250 вместо 500).${S.vipDiscount?'\n\n✅ Скидка уже активна!':''}`,
      c>=10&&!S.vipDiscount?'💎 Активировать скидку':'Закрыть',()=>{
      if(c>=10&&!S.vipDiscount){removeInv('crystal',10);S.vipDiscount=true;save();closeGenMo();toast('💎 Скидка 50% на VIP активирована!','g');rShopItems();}
      else{closeGenMo();}
    });
  } else if(a==='activateBonus3'){
    openGenMo('⚡ Бонус ×3',`Следующий денежный приз в кейсе будет умножен на 3!\nДействует 1 раз и исчезнет из инвентаря.${S.bonusMulti?'\n\n⚠️ Уже активен бонус ×'+S.bonusMulti:''}`,
      '⚡ Активировать',()=>{removeInv('bonus3',1);S.bonusMulti=3;save();closeGenMo();toast('⚡ Бонус ×3 активирован!','g');renderInv();});
  } else if(a==='activateBonus5'){
    openGenMo('🔥 Бонус ×5',`Следующий денежный приз в кейсе будет умножен на 5!\nДействует 1 раз.${S.bonusMulti?'\n\n⚠️ Уже активен бонус ×'+S.bonusMulti:''}`,
      '🔥 Активировать',()=>{removeInv('bonus5',1);S.bonusMulti=5;save();closeGenMo();toast('🔥 Бонус ×5 активирован!','g');renderInv();});
  } else if(a==='useTicket'){
    openGenMo('🎟️ Билет','Билеты используются для участия в платных розыгрышах.\nПока активных розыгрышей с билетами нет.','Закрыть',()=>closeGenMo());
  } else if(a==='useSuper'){
    openGenMo('🌟 Супер','Позволяет сменить цвет ника 1 раз бесплатно.\nПосле выбора предмет спишется.','🌟 Выбрать цвет',()=>{closeGenMo();removeInv('super',1);save();renderInv();openColorPicker(true);});
  } else if(a==='wearCrown'){
    openGenMo('👑 Корона','Надень корону на аватарку навсегда!\nКорона отображается над фото профиля на главном экране и в профиле.','👑 Надеть',()=>{removeInv('crown',1);S.hasCrown=true;save();applyCrown();closeGenMo();toast('👑 Корона надета!','g');renderInv();});
  } else if(a==='activateLegendItem'){
    closeGenMo();
    renderLegendColors();
    document.getElementById('lgmo').classList.add('show');
  } else if(a==='openMegaGift'){
    removeInv('megagift',1);save();renderInv();closeGenMo();
    openMegaGift();
  }
}

/* ══ LEGEND COLOR PICKER ══ */
let selLegCol=LEGEND_COLORS[0];
function renderLegendColors(){
  document.getElementById('lg-colors').innerHTML=LEGEND_COLORS.map(c=>`
    <div class="lgcitem${selLegCol===c?' sel':''}" style="background:${c}" onclick="selLegCol='${c}';renderLegendColors()"></div>`).join('');
}
function activateLegend(){
  if(!invCount('legend')){toast('Нет предмета Легенда','r');document.getElementById('lgmo').classList.remove('show');return;}
  removeInv('legend',1);
  S.legendExpiry=Date.now()+14*86400000;
  S.legendColor=selLegCol;
  save();applyLegend();
  document.getElementById('lgmo').classList.remove('show');
  toast('✨ Легенда активирована на 14 дней!','g');
  renderInv();
}
