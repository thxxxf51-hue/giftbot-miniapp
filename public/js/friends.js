/* ══ FRIENDS ══ */
function rRefStats(){
  document.getElementById('ref-c1').textContent=S.refs.length;
  document.getElementById('ref-e').innerHTML=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${S.refEarned.toLocaleString('ru')}`;
  const cnt=Math.min(S.refs.length,3);
  document.getElementById('ref-pb').style.width=(cnt/3*100)+'%';
  document.getElementById('ref-pt').textContent=cnt+' / 3';
  document.getElementById('p-refs').textContent=S.refs.length;
}

function rRefList(){
  const el=document.getElementById('ref-list');if(!el)return;
  if(!S.refs.length){el.innerHTML=`<div class="norefs"><div class="nrico">👥</div><div class="nrt">Пока нет рефералов</div></div>`;return;}
  el.innerHTML=S.refs.map(r=>`<div class="gc" style="padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px">
    <div style="width:34px;height:34px;border-radius:50%;background:var(--gdim);border:1px solid var(--gbor);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">👤</div>
    <div style="flex:1"><div style="font-size:13px;font-weight:600">${r.name}</div><div style="font-size:10px;color:var(--muted2)">${r.date}</div></div>
    <div style="color:var(--green);font-size:11px;font-weight:700">+1000 🪙</div>
  </div>`).join('');
}

function copyRef(){navigator.clipboard?.writeText(document.getElementById('ref-link').textContent).catch(()=>{});toast('📋 Скопировано!','g');}

function shareRef(){
  const t=document.getElementById('ref-link').textContent;
  const msg=encodeURIComponent('🎁 Присоединяйся к GiftBot — получи 1000 монет!');
  if(tg)tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(t)}&text=${msg}`);else copyRef();
}

/* ══ PROMO ══ */
async function usePromo(inputId){
  const el=document.getElementById(inputId);
  const code=(el.value||'').trim().toUpperCase();
  if(!code){toast('Введите промокод','r');return;}
  if(S.usedPromos.has(code)){toast('❌ Уже использован','r');el.value='';return;}
  el.disabled=true;
  const btn=el.nextElementSibling;
  const oldTxt=btn.textContent;btn.textContent='...';btn.disabled=true;
  try{
    const isVip=S.vipExpiry&&Date.now()<S.vipExpiry;
    const r=await fetch('/api/promo',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code,userId:UID,isVip})
    });
    const d=await r.json();
    if(d.ok){
      S.usedPromos.add(code);
      S.balance=d.balance;
      el.value='';
      syncB();rShopItems();
      toast(`+${d.reward} монет!`,'g',PROMO_ICO);
    } else {
      toast(d.error||'❌ Неверный промокод','r');
    }
  }catch(e){
    toast('❌ Ошибка соединения с сервером','r');
  }
  el.disabled=false;btn.textContent=oldTxt;btn.disabled=false;
}
