/* ══ TELEGRAM ══ */
const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();try{tg.setHeaderColor('#0a0a0a');tg.setBackgroundColor('#0a0a0a');}catch(e){}}
/* Parse user safely — try initDataUnsafe first, then parse initData string */
let TGU=(()=>{
  try{
    const u=tg?.initDataUnsafe?.user;
    if(u&&u.id&&u.id!==0)return u;
    // fallback: parse raw initData
    const raw=tg?.initData||'';
    const params=new URLSearchParams(raw);
    const userStr=params.get('user');
    if(userStr){const p=JSON.parse(decodeURIComponent(userStr));if(p&&p.id)return p;}
  }catch(e){}
  return {id:123456,first_name:'Dev',username:'dev',photo_url:null};
})();
const UID=String(TGU.id);

/* ══ STORAGE ══ */
const SK='gb4_'+UID;
function load(){try{const d=JSON.parse(localStorage.getItem(SK)||'{}');return d.v===5?d:null;}catch{return null;}}
function save(){try{localStorage.setItem(SK,JSON.stringify({v:5,balance:S.balance,starsBalance:S.starsBalance,doneTasks:[...S.doneTasks],usedPromos:[...S.usedPromos],regDate:S.regDate,refs:S.refs,refEarned:S.refEarned,refBy:S.refBy,vipExpiry:S.vipExpiry,nickColor:S.nickColor,hasCrown:S.hasCrown,legendExpiry:S.legendExpiry,legendColor:S.legendColor,inventory:S.inventory,bonusMulti:S.bonusMulti,vipDiscount:S.vipDiscount,task3refsDone:S.task3refsDone,task5refsDone:S.task5refsDone,entryEffect:S.entryEffect,effectExpiries:S.effectExpiries,ownedEffects:S.ownedEffects,walletAddress:S.walletAddress,localTx:S.localTx||[],joinedDraws:S.joinedDraws||[]}));}catch{}}

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
  task5refsDone:sv?.task5refsDone||false,
  entryEffect:sv?.entryEffect||null,
  effectExpiries:(()=>{
    // migrate legacy single entryEffectExpiry → per-effect dict
    const existing = sv?.effectExpiries || {};
    if (sv?.entryEffect && sv?.entryEffectExpiry && !existing[sv.entryEffect]) {
      existing[sv.entryEffect] = sv.entryEffectExpiry;
    }
    return existing;
  })(),
  ownedEffects:sv?.ownedEffects||[],
  walletAddress:sv?.walletAddress||null,
  localTx:sv?.localTx||[],
  joinedDraws:sv?.joinedDraws||[],
};

/* ══ REF PARAM ══ */
(function(){
  try{
    const sp=tg?.initDataUnsafe?.start_param||'';
    if(!sp.startsWith('ref_'))return;
    const rUID=sp.replace('ref_','');
    if(rUID===UID||S.refBy)return;
    S.refBy=rUID;
    save();
    // Регистрируем реферала на сервере (не через localStorage!)
    fetch('/api/ref/register',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,refUID,username:TGU.username||'',firstName:TGU.first_name||''})
    }).catch(()=>{});
  }catch{}
})();

/* ══ SYNC ══ */
function syncB(){
  const b=S.balance.toLocaleString('ru');
  const sb=S.starsBalance;
  ['home','tasks','shop','inv','raffles','friends','profile','pvp'].forEach(k=>{const el=document.getElementById('b-'+k);if(el)el.textContent=b;});
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
  if(st==='active'){const d=Math.ceil((S.vipExpiry-Date.now())/86400000);el.textContent='до '+new Date(S.vipExpiry).toLocaleDateString('ru',{day:'numeric',month:'long'});}
  else if(st==='expired'){el.textContent='Истёк';}
  else{el.textContent='—';}
  // avatar vip badge
  const badge=document.getElementById('p-vip-badge');
  if(badge) badge.style.display=(st==='active'?'block':'none');
}

/* ══ NICK COLOR ══ */
function applyNick(cid){
  S.nickColor=cid;save();
  const cls='uname '+(cid||'nc-default');
  const wh=document.getElementById('h-name-wrap');
  if(wh)wh.className=cls;
  const wp=document.getElementById('p-name-wrap');
  if(wp)wp.className='prn-name '+cls;
  const pc=document.getElementById('p-color');
  const c=COLORS.find(x=>x.id===cid);
  if(pc)pc.textContent=c?c.label:'Стандартный';
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
    el.innerHTML=`<div class="inv-empty"><div class="inv-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#363545" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" width="56" height="56"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div><div class="inv-empty-t">Инвентарь пуст</div><div class="inv-empty-s">Открывай кейсы чтобы получать предметы</div></div>`;
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
    openInvActionMo('crown', cnt);
  } else if(a==='activateLegendItem'){
    openInvActionMo('legend', cnt);
  } else if(a==='openMegaGift'){
    removeInv('megagift',1);save();renderInv();closeGenMo();
    openMegaGift();
  }
}

/* ══ CROWN / LEGEND ACTION MODAL ══ */
function openInvActionMo(key, cnt) {
  const isCrown = key === 'crown';
  const sellPrice = isCrown ? 777 : 333;
  const title = isCrown ? '👑 Корона ×'+cnt : '✨ Легенда ×'+cnt;
  const sub   = isCrown
    ? 'Надень корону на аватарку или обменяй на монеты.'
    : 'Активируй свечение вокруг аватарки или обменяй на монеты.';

  // Use genmo modal with custom extra buttons
  document.getElementById('gm-t').textContent = title;
  document.getElementById('gm-s').textContent = sub;

  const extra = document.getElementById('gm-extra');
  if (extra) {
    extra.innerHTML =
      '<div class="inv-act-btns-wrap">' +
        '<button onclick="doWearItem(\''+key+'\')" class="inv-act-btn inv-act-wear">' +
          (isCrown ? '👑 Надеть' : '✨ Активировать') +
        '</button>' +
        '<button onclick="doSellItem(\''+key+'\','+sellPrice+')" class="inv-act-btn inv-act-sell">' +
          '💰 Обменять за ' + sellPrice + '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>' +
        '</button>' +
      '</div>';
  }

  // Make modal taller
  const sheet = document.querySelector('#genmo .modal-sheet');
  if (sheet) sheet.style.paddingBottom = '28px';

  // Hide default action button, show modal
  const aBtn = document.getElementById('gm-a');
  if (aBtn) aBtn.style.display = 'none';
  document.getElementById('genmo').classList.add('show');
}

function doWearItem(key) {
  document.getElementById('gm-a').style.display = '';
  closeGenMo();
  if (key === 'crown') {
    removeInv('crown', 1); S.hasCrown = true; save(); applyCrown();
    toast('👑 Корона надета!', 'g'); renderInv();
  } else {
    renderLegendColors();
    document.getElementById('lgmo').classList.add('show');
  }
}

function doSellItem(key, price) {
  document.getElementById('gm-a').style.display = '';
  closeGenMo();
  sellInvItem(key, price);
}

/* ══ SELL INVENTORY ITEMS ══ */
function sellInvItem(key, rate){
  if(!rate){const rates={crown:777,legend:333};rate=rates[key];}
  if(!rate)return;
  const cnt=invCount(key);if(!cnt){toast('Нет предмета','r');return;}
  removeInv(key,1);
  S.balance+=rate;syncB();
  toast('💰 Обменяно за +'+rate+' монет!','g');
  renderInv();
}

/* ══ TIMED CROWN / LEGEND ══ */
function activateCrownTimed(days){
  const exp=Date.now()+days*86400000;
  if(!S.crownExpiry||S.crownExpiry<exp)S.crownExpiry=exp;
  S.hasCrown=true;save();applyCrown();
  toast('👑 Корона на '+days+' дн. активирована!','g');
}

function activateLegendTimed(days){
  const exp=Date.now()+days*86400000;
  if(!S.legendExpiry||S.legendExpiry<exp)S.legendExpiry=exp;
  if(!S.legendColor)S.legendColor=LEGEND_COLORS[0];
  save();applyLegend();
  toast('✨ Легенда на '+days+' дн. активирована!','g');
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

/* ══ TRANSACTIONS ══ */
async function loadTxList() {
  const el = document.getElementById('tx-list');
  if (!el) return;
  try {
    const r = await fetch('/api/transactions?userId=' + UID);
    const d = await r.json();
    const serverTxs = (d.ok && d.transactions) ? d.transactions : [];
    // Merge server + local, deduplicate by id (preferred) or date+amount+details
    const localTxs = S.localTx || [];
    const seenIds = new Set(serverTxs.map(t => t.id).filter(Boolean));
    const seenFallback = new Set(serverTxs.map(t => t.date + t.amount + (t.details||'')));
    const merged = [...serverTxs, ...localTxs.filter(t => {
      if (t.id && seenIds.has(t.id)) return false;
      if (!t.id && seenFallback.has(t.date + t.amount + (t.details||''))) return false;
      return true;
    })];
    // Remove local txs that are now on server
    S.localTx = (S.localTx||[]).filter(t => {
      if (t.id && seenIds.has(t.id)) return false;
      if (!t.id && seenFallback.has(t.date + t.amount + (t.details||''))) return false;
      return true;
    });
    save();
    merged.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const all = merged;
    if (!all.length) {
      el.innerHTML = '<div class="tx-empty">Нет транзакций</div>';
      return;
    }
    el.innerHTML = all.map(tx => {
      const amt = String(tx.amount);
      const isPos = amt.startsWith('+');
      const isNeg = amt.startsWith('-');
      return `<div class="tx-row">
        <span><span class="tx-badge">${tx.type}</span></span>
        <span class="tx-amt ${isPos?'pos':isNeg?'neg':''}">${tx.amount}</span>
        <span class="tx-det">${tx.details||'—'}</span>
        <span class="tx-date">${tx.date||'—'}</span>
      </div>`;
    }).join('');
  } catch {
    // Fallback to local
    const localTxs = S.localTx || [];
    if (!localTxs.length) { el.innerHTML = '<div class="tx-empty">Нет транзакций</div>'; return; }
    el.innerHTML = localTxs.map(tx => {
      const isPos = String(tx.amount).startsWith('+');
      const isNeg = String(tx.amount).startsWith('-');
      return `<div class="tx-row">
        <span><span class="tx-badge">${tx.type}</span></span>
        <span class="tx-amt ${isPos?'pos':isNeg?'neg':''}">${tx.amount}</span>
        <span class="tx-det">${tx.details||'—'}</span>
        <span class="tx-date">${tx.date||'—'}</span>
      </div>`;
    }).join('');
  }
}
