/* ══ TASKS ══ */
function renderTasks(){
  document.getElementById('tasks-list').innerHTML=TASKS.map(t=>{
    const done=S.doneTasks.has(t.id);
    return`<div class="gc ti" onclick="openTask(${t.id})">
      <div class="tico">${t.ico}</div>
      <div class="tinf">
        <div class="ttag ${t.tc}">${t.tag}</div>
        <div class="tname">${t.name}</div>
        <div class="tdesc">${t.desc}</div>
      </div>
      ${done?'<div class="tdone">✓</div>':`<div class="trew">+${t.rew}🪙</div>`}
    </div>`;
  }).join('');
}

function openTask(id){
  const t=TASKS.find(x=>x.id===id);if(!t)return;
  if(S.doneTasks.has(id)){toast('✅ Уже выполнено','g');return;}
  if(t.check==='ref'){
    if(S.refs.length>0){completeTask(id);}
    else{openGenMo('👥 Пригласи друга',`Пригласи друга по реф-ссылке и получи +${t.rew} монет`,'👥 К рефералам',()=>{closeGenMo();go('friends');});}
    return;
  }
  if(t.check==='case'){
    openGenMo('📦 Открыть кейс',`Открой любой кейс в Магазине → Кейсы и получи +${t.rew} монет`,'📦 В магазин',()=>{closeGenMo();go('shop');setTimeout(()=>{document.querySelectorAll('.stab')[1]?.click();},300);});
    return;
  }
  if(t.check==='sub'){
    openGenMo('📢 '+t.name,`Подпишись на @${t.channel} и вернись — нажми "Проверить подписку"`,
      '📢 Перейти на канал',()=>{
        if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
        closeGenMo();
        setTimeout(()=>showVerifyBtn(t),800);
      }
    );return;
  }
  if(t.check==='chat'){
    openGenMo('💬 '+t.name,`Зайди в @${t.channel}, напиши любое слово и вернись — нажми "Проверить"`,
      '💬 Открыть чат',()=>{
        if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
        closeGenMo();
        setTimeout(()=>showVerifyBtn(t),800);
      }
    );return;
  }
}

function showVerifyBtn(t){
  openGenMo(
    '🔍 Проверка задания',
    t.check==='sub'
      ? `Подписался ли ты на @${t.channel}?`
      : `Написал ли ты слово в @${t.channel}?`,
    '✅ Проверить',
    ()=>verifyTask(t)
  );
  document.querySelector('#genmo .mbtn.gray').textContent='Ещё не выполнил';
  document.querySelector('#genmo .mbtn.gray').onclick=()=>{
    closeGenMo();
    toast(t.check==='sub'?'Вы не подписались':'Вы не написали слово в чат','r');
  };
}

async function verifyTask(t){
  const uid=UID;
  document.getElementById('gm-a').textContent='Проверяем...';
  document.getElementById('gm-a').disabled=true;
  try{
    if(t.check==='sub'){
      const r=await fetch('/api/check-sub',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:uid,channel:t.channel})});
      const d=await r.json();
      if(d.subscribed){completeTask(t.id);}
      else{closeGenMo();toast('Вы не подписались','r');}
    } else if(t.check==='chat'){
      const r=await fetch('/api/check-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:uid,channel:t.channel})});
      const d=await r.json();
      if(d.member){completeTask(t.id);}
      else{closeGenMo();toast('Вы не в чате','r');}
    }
  }catch(e){
    closeGenMo();toast('Ошибка проверки. Попробуй ещё раз','r');
  }
  document.getElementById('gm-a').disabled=false;
}

function completeTask(id){
  S.doneTasks.add(id);
  const t=TASKS.find(x=>x.id===id);
  if(t){S.balance+=t.rew;syncB();}
  closeGenMo();renderTasks();
  toast(`+${t?.rew||0} монет! 🎉`,'g');
}
