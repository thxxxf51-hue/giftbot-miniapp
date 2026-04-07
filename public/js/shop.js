/* ══ TX HELPER ══ */
async function addServerTx(type,amount,details){
  try{await fetch('/api/transactions/add',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:UID,type,amount,details})});}catch{}
}

const _SHOP_COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:middle;margin-right:2px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;

/* ══ CUSTOM SHOP ITEMS ══ */
let customShopItems=[];
let _shopItemOverrides={};
async function loadCustomShopItems(){
  try{
    const r=await fetch('/api/shop/custom');
    customShopItems=await r.json();
  }catch{customShopItems=[];}
  try{
    const ro=await fetch('/api/shop/item-overrides');
    _shopItemOverrides=await ro.json();
  }catch{_shopItemOverrides={};}
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

  const stdHtml=ITEMS.map(rawX=>{
    const x={...rawX,...(_shopItemOverrides[rawX.id]||{})};
    let price=x.price;
    if(x.id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
    const isVip=vipStatus()==='active';
    if(x.special==='effect'&&isVip)price=Math.floor(x.price*0.6);
    const ok2=S.balance>=price;

    const fallbackIco=`<div class="sico-fb">${ITEM_ICONS[x.icoKey]||''}</div>`;
    const _imgCls=x.imageUrl?` sitem-img--id${x.id}`:'';
    const imgContent=x.imageUrl
      ?`<img class="sitem-img${_imgCls}" src="${x.imageUrl}" alt="${x.name}" onerror="this.style.display='none';var fb=this.nextElementSibling;if(fb)fb.style.display='flex'">${fallbackIco}`
      :fallbackIco;

    let btn;
    if(x.wip){
      btn=_shopBuyBtn(' wip',true,'','В разработке',null);
    } else {
      btn=_shopBuyBtn(ok2?'':' nomoney',false,`event.stopPropagation();openShopModal('std',${x.id})`,ok2?'Купить за':'Купить',ok2?price:null);
    }

    return`<div class="sitem" onclick="openShopModal('std',${x.id})">
      <div class="sitem-img-wrap">${imgContent}</div>
      <div class="sitem-body">
        <div class="sname">${x.name}</div>
        ${x.desc?`<div class="sitem-desc">${x.desc}</div>`:''}
      </div>
      ${btn}
    </div>`;
  }).join('');

  function _buildCustomItemHtml(x){
    const stockLeft=x.stock!==null&&x.stock!==undefined?Number(x.stock):null;
    const ok2=(S.balance>=x.price)&&(stockLeft===null||stockLeft>0);
    const isNew=!!(x.tag&&x.tag.toUpperCase()==='NEW')||!!x.borderColor;
    const borderStyle=isNew
      ?`style="border-color:rgba(64,135,246,0.5)!important;box-shadow:0 0 0 1px rgba(64,135,246,0.3)"`
      :(x.borderColor?`style="border-color:${x.borderColor}!important"`:'');
    const tagHtml=x.tag?`<div class="sitem-tag-badge" style="background:${x.tagColor||'#e53935'}">${x.tag}</div>`:'';
    const cntHtml=stockLeft!==null?`<div style="position:absolute;top:6px;right:6px;z-index:20;background:rgba(0,0,0,0.65);color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;pointer-events:none;white-space:nowrap;backdrop-filter:blur(4px)">${stockLeft>0?stockLeft+' шт. в наличии':'Нет в наличии'}</div>`:(x.count?`<div style="position:absolute;top:6px;right:6px;z-index:20;background:rgba(0,0,0,0.65);color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;pointer-events:none;white-space:nowrap">${x.count} шт.</div>`:'');
    const fallbackIco=`<div class="sico-fb">${ITEM_ICONS['shop']||''}</div>`;
    const imgContent=x.imageUrl
      ?`<img src="${x.imageUrl}" alt="${x.name}" onerror="this.style.display='none';var fb=this.nextElementSibling;if(fb)fb.style.display='flex'">${fallbackIco}`
      :fallbackIco;
    const btnCls=(isNew?' new-item':(ok2?'':' nomoney'));
    const btn=_shopBuyBtn(btnCls,false,`event.stopPropagation();openShopModal('custom',${x.id})`,ok2?'Купить за':'Купить',ok2?x.price:null);
    return`<div class="sitem" ${borderStyle} style="position:relative;overflow:visible" onclick="openShopModal('custom',${x.id})">
      ${cntHtml}
      <div class="sitem-img-wrap" style="overflow:visible">${tagHtml}${imgContent}</div>
      <div class="sitem-body">
        <div class="sname">${x.name}</div>
        ${x.desc?`<div class="sitem-desc">${x.desc}</div>`:''}
      </div>
      ${btn}
    </div>`;
  }

  // NEW custom items go first (before all standard items), rest go after standard
  const newCustomItems=customShopItems.filter(x=>(!!(x.tag&&x.tag.toUpperCase()==='NEW')||!!x.borderColor));
  const restCustomItems=customShopItems.filter(x=>!(!!(x.tag&&x.tag.toUpperCase()==='NEW')||!!x.borderColor));
  const newCustomHtml=newCustomItems.map(_buildCustomItemHtml).join('');
  const restCustomHtml=restCustomItems.map(_buildCustomItemHtml).join('');

  el.innerHTML=newCustomHtml+stdHtml+restCustomHtml;
}

/* ══ SHOP ITEM MODAL ══ */
const _SHOPMO_COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const _SHOPMO_THUMB_FB=`<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:34px;height:34px"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;

function openShopModal(type,id){
  const mo=document.getElementById('shopmo');
  if(!mo)return;
  let x;
  if(type==='std'){
    const base=ITEMS.find(i=>i.id===id);
    if(!base)return;
    x={...base,...(_shopItemOverrides[id]||{})};
  } else {
    x=customShopItems.find(i=>i.id===id);
  }
  if(!x)return;

  let price=x.price;
  if(type==='std'){
    if(id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
    if(x.special==='effect'&&vipStatus()==='active')price=Math.floor(x.price*0.6);
  }
  const ok2=S.balance>=price;
  const need=price-S.balance;
  const isNew=!!(x.tag&&x.tag.toUpperCase()==='NEW')||!!(type==='custom'&&x.borderColor);

  // thumbnail
  const thumbHtml=x.imageUrl
    ?`<img src="${x.imageUrl}" alt="${x.name}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block" onerror="this.style.display='none'">`
    :_SHOPMO_THUMB_FB;

  // price row (only for purchasable items)
  const priceRow=(!x.wip&&!x.special)
    ?`<div class="shopmo-confirm-price">${_SHOPMO_COIN_ICO}<span class="shopmo-confirm-price-val">${price.toLocaleString('ru')}</span></div>`
    :'';

  // insufficient notice
  const insuf=(!ok2&&!x.wip&&!x.special)
    ?`<div class="shopmo-confirm-insuf">Недостаточно монет. Нужно ещё ${need.toLocaleString('ru')}</div>`
    :'';

  // buy button
  let btnCls,btnTxt,btnOnclick,btnDisabled='';
  if(x.wip){
    btnCls='shopmo-confirm-btn--nomoney';btnTxt='В разработке';btnDisabled=' disabled';btnOnclick='';
  } else if(x.special==='color'){
    btnCls=isNew?'shopmo-confirm-btn--blue':'shopmo-confirm-btn--green';
    btnTxt='Выбрать цвет';btnOnclick=`closeShopModal();openColorPicker(false)`;
  } else if(x.special==='effect'){
    btnCls=isNew?'shopmo-confirm-btn--blue':'shopmo-confirm-btn--green';
    btnTxt='Выбрать эффект';btnOnclick=`closeShopModal();openEffectPicker()`;
  } else if(!ok2){
    btnCls='shopmo-confirm-btn--nomoney';btnTxt=`Мало монет (нужно ещё ${need.toLocaleString('ru')})`;btnDisabled=' disabled';btnOnclick='';
  } else {
    btnCls=isNew?'shopmo-confirm-btn--blue':'shopmo-confirm-btn--green';
    btnTxt=`Купить за ${price.toLocaleString('ru')} монет`;
    btnOnclick=`doShopModalBuy('${type}',${id})`;
  }

  const desc=x.desc||'';
  const managerBlock=type==='custom'?`
    <div class="shopmo-manager-notice">
      <div class="shopmo-manager-text">Менеджер (<span style="color:#10B981">@assate</span>) в ближайшее время свяжется с вами по поводу выдачи товара.</div>
      <div class="shopmo-manager-warn">
        <div class="shopmo-manager-warn-ico">⚠️</div>
        <div class="shopmo-manager-warn-text">Это единственный аккаунт, который сам напишет вам по поводу выдачи товаров, остальные — мошенники.<br>Обязательно установите Telegram @username, чтобы менеджер мог связаться с вами.</div>
      </div>
    </div>`:'';

  document.getElementById('shopmo-content').innerHTML=`
    <div class="shopmo-confirm-hdr">
      <div class="shopmo-confirm-title">Подтверждение покупки</div>
      <button class="shopmo-confirm-close" onclick="closeShopModal()">✕</button>
    </div>
    <div class="shopmo-confirm-body">
      <div class="shopmo-confirm-row">
        <div class="shopmo-confirm-thumb">${thumbHtml}</div>
        <div class="shopmo-confirm-info">
          <div class="shopmo-confirm-name">${x.name}</div>
          ${desc?`<div class="shopmo-confirm-desc">${desc}</div>`:''}
          ${priceRow}
        </div>
      </div>
      ${insuf}
      <button class="shopmo-confirm-btn ${btnCls}"${btnDisabled}${btnOnclick?` onclick="${btnOnclick}"`:''}>${btnTxt}</button>
      ${managerBlock}
    </div>`;

  mo.dataset.type=type;
  mo.dataset.id=id;
  mo.classList.add('show');
}

function closeShopModal(){
  const mo=document.getElementById('shopmo');
  if(mo)mo.classList.remove('show');
}

function doShopModalBuy(type,id){
  closeShopModal();
  if(type==='std'){
    const base=ITEMS.find(i=>i.id===id);if(!base)return;
    const x={...base,...(_shopItemOverrides[id]||{})};
    let price=x.price;
    if(id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
    if(x.special==='effect'&&vipStatus()==='active')price=Math.floor(x.price*0.6);
    if(S.balance<price){toast('Недостаточно монет','r');return;}
    S.balance-=price;
    if(x.vipDays){activateVip(x.vipDays);if(id===3&&S.vipDiscount){S.vipDiscount=false;save();}}
    if(x.crownDays){activateCrownTimed(x.crownDays);}
    syncB();rShopItems();save();
    if(x.vipDays)addServerTx('vip_buy','-'+price,'Покупка VIP на '+x.vipDays+' дн.');
    else if(x.crownDays)addServerTx('crown_buy','-'+price,'Покупка Короны на '+x.crownDays+' дн.');
    toast(x.vipDays?'👑 VIP на '+x.vipDays+' дн. активирован!':x.crownDays?'👑 Корона на '+x.crownDays+' дн. активирована!':'✅ Куплено!','g');
  } else {
    const x=customShopItems.find(i=>i.id===id);if(!x)return;
    if(S.balance<x.price){toast('Недостаточно монет','r');return;}
    S.balance-=x.price;
    syncB();rShopItems();save();
    addServerTx('shop_buy','-'+x.price,'Покупка: '+x.name);
    toast('✅ Куплено: '+x.name,'g');
  }
}

function buyItem(id){
  const x=ITEMS.find(i=>i.id===id);if(!x)return;
  let price=x.price;
  if(id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
  if(S.balance<price)return;
  openGenMo(`Купить ${x.name}?`,`Спишется ${price} монет`,`🛒 Купить — ${price} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`,()=>{
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
  openGenMo(`Купить ${x.name}?`,x.desc||`Спишется ${x.price} монет`,`🛒 Купить — ${x.price} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`,async()=>{
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
