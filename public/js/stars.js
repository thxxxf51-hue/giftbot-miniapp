/* ══ STARS TOPUP MODAL ══ */
let starsAmount=50;
let _pendingInvoiceId=null;

function openStarsMo(){
  document.getElementById('sm-bal').textContent=S.starsBalance;
  document.getElementById('stars-custom-in').value='';
  document.querySelectorAll('.stars-preset').forEach(p=>p.classList.remove('sel'));
  document.querySelector('.stars-preset').classList.add('sel');
  starsAmount=50;
  updateStarsPayBtn();
  document.getElementById('stars-check-area').classList.remove('show');
  _pendingInvoiceId=null;
  document.getElementById('stars-mo').classList.add('show');
}

function closeStarsMo(){
  document.getElementById('stars-mo').classList.remove('show');
}

function selectStarsPreset(amt,el){
  starsAmount=amt;
  document.querySelectorAll('.stars-preset').forEach(p=>p.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('stars-custom-in').value='';
  updateStarsPayBtn();
}

function onStarsCustomInput(el){
  const v=parseInt(el.value)||0;
  if(v>0){
    starsAmount=v;
    document.querySelectorAll('.stars-preset').forEach(p=>p.classList.remove('sel'));
  } else {
    starsAmount=50;
    document.querySelector('.stars-preset').classList.add('sel');
  }
  updateStarsPayBtn();
}

function updateStarsPayBtn(){
  const btn=document.getElementById('stars-pay-btn');
  const amtSpan=document.getElementById('stars-pay-amt');
  if(amtSpan) amtSpan.textContent=starsAmount>=1000?(starsAmount/1000).toLocaleString('ru')+'K':starsAmount;
  if(btn) btn.disabled=!starsAmount||starsAmount<1;
}

async function initiateStarsPayment(){
  if(!starsAmount||starsAmount<1){toast('Укажите количество Stars','r');return;}
  const btn=document.getElementById('stars-pay-btn');
  btn.disabled=true;
  btn.innerHTML='⏳ Создаём счёт...';
  try{
    const r=await fetch('/api/stars/create-invoice',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,amount:starsAmount})
    });
    const d=await r.json();
    if(d.ok&&d.invoiceLink){
      _pendingInvoiceId=d.invoiceId;
      if(tg&&tg.openInvoice){
        tg.openInvoice(d.invoiceLink,(status)=>{
          if(status==='paid'){checkStarsPayment();}
        });
      } else {
        window.open(d.invoiceLink,'_blank');
      }
      document.getElementById('stars-check-area').classList.add('show');
    } else {
      toast(d.error||'❌ Ошибка создания счёта','r');
    }
  }catch(e){
    toast('❌ Ошибка соединения','r');
  }
  btn.disabled=false;
  btn.innerHTML=`⭐ Оплатить <span id="stars-pay-amt">${starsAmount}</span> Stars`;
}

async function checkStarsPayment(){
  const btn=document.querySelector('.stars-check-btn');
  if(btn){btn.disabled=true;btn.textContent='Проверяем...';}
  try{
    const r=await fetch('/api/stars/check',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,invoiceId:_pendingInvoiceId,amount:starsAmount})
    });
    const d=await r.json();
    if(d.ok&&d.credited){
      S.starsBalance=d.starsBalance;
      syncB();
      closeStarsMo();
      toast(`⭐ +${d.amount} Stars зачислено!`,'s');
      _pendingInvoiceId=null;
    } else if(d.pending){
      toast('⏳ Оплата ещё не подтверждена, подождите','r');
    } else {
      toast(d.error||'❌ Оплата не найдена','r');
    }
  }catch(e){
    toast('❌ Ошибка проверки','r');
  }
  if(btn){btn.disabled=false;btn.textContent='🔍 Проверить оплату';}
}
