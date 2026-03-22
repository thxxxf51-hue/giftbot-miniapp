/* ══ TX HELPER ══ */
async function addServerTx(type,amount,details){
  try{await fetch('/api/transactions/add',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:UID,type,amount,details})});}catch{}
}

const _SHOP_COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:middle;margin-right:2px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;

/* ══ CUSTOM SHOP ITEMS ══ */
let customShopItems=[];
async function loadCustomShopItems(){
  try{
    const r=await fetch('/api/shop/custom');
    customShopItems=await r.json();
  }catch{customShopItems=[];}
  rShopItems();
}

/* ══ SHOP ══ */
function shopTab(tab,btn){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('shop-items').style.display=tab==='items'?'grid':'none';
  document.getElementById('shop-cases').style.display=tab==='cases'?'grid':'none';
}

function _shopBuyBtn(cls,disabled,onclick,label,price){
  const dis=disabled?' disabled':'';
  return`<button class="sbuy${cls}"${dis} onclick="${onclick}">${label}${price!=null?` ${_SHOP_COIN_ICO} ${price.toLocaleString('ru')}`:''}</button>`;
}

function rShopItems(){
  const el=document.getElementById('shop-items');
  if(!el)return;

  const stdHtml=ITEMS.map(x=>{
    let price=x.price;
    if(x.id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
    const isVip=vipStatus()==='active';
    if(x.special==='effect'&&isVip)price=Math.floor(x.price*0.6);
    const ok2=S.balance>=price;

    const fallbackIco=`<div class="sico-fb">${ITEM_ICONS[x.icoKey]||''}</div>`;
    const imgContent=x.imageUrl
      ?`<img src="${x.imageUrl}" alt="${x.name}" onerror="this.style.display='none';var fb=this.nextElementSibling;if(fb)fb.style.display='flex'">${fallbackIco}`
      :fallbackIco;

    let btn;
    if(x.wip){
      btn=_shopBuyBtn(' wip',true,'','В разработке',null);
    } else if(x.special==='color'){
      btn=`<button class="sbuy" onclick="openColorPicker(false)">Выбрать цвет</button>`;
    } else if(x.special==='effect'){
      btn=`<button class="sbuy" onclick="openEffectPicker()">Выбрать эффект</button>`;
    } else {
      btn=_shopBuyBtn(ok2?'':' nomoney',!ok2,`buyItem(${x.id})`,ok2?'Купить за':'Мало монет',ok2?price:null);
    }

    return`<div class="sitem">
      <div class="sitem-img-wrap">${imgContent}</div>
      <div class="sitem-body">
        <div class="sname">${x.name}</div>
      </div>
      ${btn}
    </div>`;
  }).join('');

  const customHtml=customShopItems.map(x=>{
    const ok2=S.balance>=x.price;
    const borderStyle=x.borderColor?`style="border-color:${x.borderColor}!important"`:'';
    const tagHtml=x.tag?`<div class="sitem-tag-badge" style="background:${x.tagColor||'#e53935'}">${x.tag}</div>`:'';
    const cntHtml=x.count?`<div class="sitem-cnt-badge">${x.count} шт.</div>`:'';
    const fallbackIco=`<div class="sico-fb">${ITEM_ICONS['shop']||''}</div>`;
    const imgContent=x.imageUrl
      ?`<img src="${x.imageUrl}" alt="${x.name}" onerror="this.style.display='none';var fb=this.nextElementSibling;if(fb)fb.style.display='flex'">${fallbackIco}`
      :fallbackIco;
    const btn=_shopBuyBtn(ok2?'':' nomoney',!ok2,`buyCustomItem(${x.id})`,ok2?'Купить за':'Мало монет',ok2?x.price:null);
    return`<div class="sitem" ${borderStyle}>
      <div class="sitem-img-wrap">${tagHtml}${cntHtml}${imgContent}</div>
      <div class="sitem-body">
        <div class="sname">${x.name}</div>
        ${x.desc?`<div style="font-size:11px;color:rgba(255,255,255,.4);line-height:1.3;margin-top:-2px">${x.desc}</div>`:''}
      </div>
      ${btn}
    </div>`;
  }).join('');

  el.innerHTML=stdHtml+customHtml;
}

function buyItem(id){
  const x=ITEMS.find(i=>i.id===id);if(!x)return;
  let price=x.price;
  if(id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
  if(S.balance<price)return;
  openGenMo(`Купить ${x.name}?`,`Спишется ${price} монет`,`🛒 Купить — ${price} 🪙`,()=>{
    S.balance-=price;
    if(x.vipDays){activateVip(x.vipDays);if(id===3&&S.vipDiscount){S.vipDiscount=false;save();}}
    if(x.crownDays){activateCrownTimed(x.crownDays);}
    syncB();rShopItems();closeGenMo();
    if(x.vipDays)addServerTx('vip_buy','-'+price,'Покупка VIP на '+x.vipDays+' дн.');
    if(x.crownDays)addServerTx('crown_buy','-'+price,'Покупка Короны на '+x.crownDays+' дн.');
    toast(x.vipDays?'👑 VIP на '+x.vipDays+' дн. активирован!':x.crownDays?'👑 Корона на '+x.crownDays+' дн. активирована!':'✅ Куплено!','g');
  });
}

function buyCustomItem(id){
  const x=customShopItems.find(i=>i.id===id);if(!x)return;
  if(S.balance<x.price)return;
  openGenMo(`Купить ${x.name}?`,x.desc||`Спишется ${x.price} монет`,`🛒 Купить — ${x.price} 🪙`,async()=>{
    S.balance-=x.price;
    syncB();rShopItems();closeGenMo();
    addServerTx('shop_buy','-'+x.price,'Покупка: '+x.name);
    toast('✅ Куплено: '+x.name,'g');
  });
}

/* ══ COLOR PICKER ══ */
let selColor='',freeColor=false;
function openColorPicker(free=false){
  freeColor=free;selColor=S.nickColor;
  const colorItem=ITEMS.find(i=>i.special==='color');
  const colorPrice=colorItem?colorItem.price:999;
  document.getElementById('cp-grid').innerHTML=COLORS.map(c=>`
    <div class="cpitem${selColor===c.id?' sel':''}" style="background:${c.grad};color:#000" onclick="selColor='${c.id}';document.querySelectorAll('.cpitem').forEach(e=>e.classList.remove('sel'));this.classList.add('sel')">${c.label}</div>`).join('');
  document.getElementById('cp-btn').textContent=free?'✨ Применить бесплатно':`Купить — ${colorPrice} 🪙`;
  document.getElementById('cpmo').classList.add('show');
}
function buyColor(){
  const colorItem=ITEMS.find(i=>i.special==='color');
  const colorPrice=colorItem?colorItem.price:999;
  if(!freeColor&&S.balance<colorPrice){toast('Недостаточно монет','r');return;}
  if(!freeColor){S.balance-=colorPrice;syncB();addServerTx('color_buy','-'+colorPrice,'Покупка цветного ника');}
  applyNick(selColor);
  document.getElementById('cpmo').classList.remove('show');
  toast('🌈 Цвет ника изменён!','g');
}
