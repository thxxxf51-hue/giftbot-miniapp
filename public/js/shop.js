/* ══ TX HELPER ══ */
async function addServerTx(type,amount,details){
  try{await fetch('/api/transactions/add',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:UID,type,amount,details})});}catch{}
}

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

function rShopItems(){
  const el=document.getElementById('shop-items');
  if(!el)return;

  const stdHtml=ITEMS.map(x=>{
    const ok=S.balance>=x.price;
    let btn,price=x.price;
    if(x.id===3&&S.vipDiscount)price=Math.floor(x.price*0.5);
    if(x.special==='effect'&&vipStatus()==='active')price=3000;
    const ok2=S.balance>=price;
    if(x.wip)btn=`<button class="sbuy wip" disabled>В разработке</button>`;
    else if(x.special==='color')btn=`<button class="sbuy" onclick="openColorPicker(false)">Выбрать цвет</button>`;
    else if(x.special==='effect')btn=`<button class="sbuy" onclick="openEffectPicker()">Выбрать эффект</button>`;
    else btn=`<button class="sbuy${ok2?'':' nomoney'}"${ok2?'':' disabled'} onclick="buyItem(${x.id})">${ok2?'Купить':'Мало монет'}</button>`;
    let priceLabel;
    if(x.id===3&&S.vipDiscount){
      const disc=Math.floor(x.price*0.5);
      priceLabel=`<span style="text-decoration:line-through;opacity:.5">${x.price}</span> <span style="color:var(--green)">${disc} 🪙</span>`;
    } else if(x.special==='effect'){
      const vipPr=Math.floor(x.price*0.6);
      const isVip=vipStatus()==='active';
      priceLabel=isVip?`<span style="text-decoration:line-through;opacity:.5">${x.price}</span> <span style="color:var(--green)">${vipPr} 🪙 VIP</span>`:`${price} 🪙`;
    } else {
      priceLabel=`${price} 🪙`;
    }
    return`<div class="gc sitem">
      <div class="sico">${ITEM_ICONS[x.icoKey]||''}</div>
      <div class="sname">${x.name}</div>
      <div class="sprice">${priceLabel}</div>
      ${btn}
    </div>`;
  }).join('');

  const customHtml=customShopItems.map(x=>{
    const ok2=S.balance>=x.price;
    const borderStyle=x.borderColor?`border:1px solid ${x.borderColor};`:'';
    const tagHtml=x.tag?`<div class="sitag" style="background:${x.tagColor||'rgba(255,255,255,.12)'}">${x.tag}</div>`:'';
    const imgHtml=x.imageUrl?`<img src="${x.imageUrl}" onerror="this.style.display='none'" style="width:52px;height:52px;object-fit:cover;border-radius:10px;margin-bottom:4px">`:
      `<div class="sico">${ITEM_ICONS['shop']||''}</div>`;
    return`<div class="gc sitem" style="${borderStyle}position:relative">
      ${tagHtml}
      ${imgHtml}
      <div class="sname">${x.name}</div>
      ${x.desc?`<div class="sdesc">${x.desc}</div>`:''}
      <div class="sprice">${x.price} 🪙</div>
      <button class="sbuy${ok2?'':' nomoney'}"${ok2?'':' disabled'} onclick="buyCustomItem(${x.id})">${ok2?'Купить':'Мало монет'}</button>
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
