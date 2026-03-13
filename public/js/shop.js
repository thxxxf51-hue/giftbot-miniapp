/* ══ TX HELPER ══ */
async function addServerTx(type,amount,details){
  try{await fetch('/api/transactions/add',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:UID,type,amount,details})});}catch{}
}

/* ══ SHOP ══ */
function shopTab(tab,btn){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('shop-items').style.display=tab==='items'?'grid':'none';
  document.getElementById('shop-cases').style.display=tab==='cases'?'grid':'none';
}

function rShopItems(){
  document.getElementById('shop-items').innerHTML=ITEMS.map(x=>{
    const ok=S.balance>=x.price;
    let btn,price=x.price;
    if(x.id===3&&S.vipDiscount)price=250;
    if(x.special==='effect'&&vipStatus()==='active')price=1500;
    const ok2=S.balance>=price;
    if(x.wip)btn=`<button class="sbuy wip" disabled>В разработке</button>`;
    else if(x.special==='color')btn=`<button class="sbuy" onclick="openColorPicker(false)">Выбрать цвет</button>`;
    else if(x.special==='effect')btn=`<button class="sbuy" onclick="openEffectPicker()">Выбрать эффект</button>`;
    else btn=`<button class="sbuy${ok2?'':' nomoney'}"${ok2?'':' disabled'} onclick="buyItem(${x.id})">${ok2?'Купить':'Мало монет'}</button>`;
    const priceLabel=x.id===3&&S.vipDiscount?`<span style="text-decoration:line-through;opacity:.5">${x.price}</span> <span style="color:var(--green)">${price} 🪙</span>`:`${price} 🪙`;
    return`<div class="gc sitem">
      <div class="sico">${ITEM_ICONS[x.icoKey]||''}</div>
      <div class="sname">${x.name}</div>
      <div class="sprice">${priceLabel}</div>
      ${btn}
    </div>`;
  }).join('');
}

function buyItem(id){
  const x=ITEMS.find(i=>i.id===id);if(!x)return;
  let price=x.price;
  if(id===3&&S.vipDiscount)price=250;
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

/* ══ COLOR PICKER ══ */
let selColor='',freeColor=false;
function openColorPicker(free=false){
  freeColor=free;selColor=S.nickColor;
  document.getElementById('cp-grid').innerHTML=COLORS.map(c=>`
    <div class="cpitem${selColor===c.id?' sel':''}" style="background:${c.grad};color:#000" onclick="selColor='${c.id}';document.querySelectorAll('.cpitem').forEach(e=>e.classList.remove('sel'));this.classList.add('sel')">${c.label}</div>`).join('');
  document.getElementById('cp-btn').textContent=free?'✨ Применить бесплатно':'Купить — 250 🪙';
  document.getElementById('cpmo').classList.add('show');
}
function buyColor(){
  if(!freeColor&&S.balance<250){toast('Недостаточно монет','r');return;}
  if(!freeColor){S.balance-=250;syncB();addServerTx('color_buy','-250','Покупка цветного ника');}
  applyNick(selColor);
  document.getElementById('cpmo').classList.remove('show');
  toast('🌈 Цвет ника изменён!','g');
}
