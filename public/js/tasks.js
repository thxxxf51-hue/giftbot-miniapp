/* ══ TASKS ══ */
const COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-1px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;

function renderTasks(){
  const wrap=document.createElement('div');
  wrap.className='tlist';
  TASKS.forEach(t=>{
    const done=S.doneTasks.has(t.id);
    const card=document.createElement('div');
    card.className='tc'+(t.wip?' tc--wip':'');
    card.onclick=()=>openTask(t.id);

    let tags=`<div class="tc-tag tc-tag--${t.tc}">${t.tag}</div>`;
    if(done)    tags+=`<div class="tc-tag tc-tag--done">✓ Выполнено</div>`;
    if(t.wip)   tags+=`<div class="tc-tag tc-tag--wip">В разработке</div>`;
    if(t.isNew) tags+=`<div class="tc-tag tc-tag--new">NEW</div>`;

    const rew=done?'':`<div class="tc-rew">${COIN_ICO} ${t.rew.toLocaleString('ru')}</div>`;

    let pct=0;
    if(done){ pct=100; }
    else if(t.prog!=null){ pct=Math.min(100,Math.round((t.prog.cur/t.prog.max)*100)); }

    const progTxt=(t.prog&&!done)
      ?`<div class="tc-prog-txt">${t.prog.cur} / ${t.prog.max}${t.prog.unit?' '+t.prog.unit:''}</div>`
      :'';
    const progress=`<div class="tc-prog-bar"><div class="tc-prog-fill" style="width:${pct}%"></div></div>${progTxt}`;

    card.innerHTML=`
      <div class="tc-top">${tags}${rew}</div>
      <div class="tc-name">${t.name}</div>
      <div class="tc-desc">${t.desc}</div>
      ${progress}`;
    wrap.appendChild(card);
  });
  document.getElementById('tasks-list').innerHTML='';
  document.getElementById('tasks-list').appendChild(wrap);
}

function openTask(id){
  const t=TASKS.find(x=>x.id===id);if(!t)return;
  if(t.wip){toast('⏳ Задание в разработке','g');return;}
  if(S.doneTasks.has(id)){toast('✅ Уже выполнено','g');return;}
  if(t.check==='ref'){
    if(S.refs.length>0){completeTask(id);}
    else{openGenMo('Пригласи друга',`Пригласи друга по реф-ссылке и получи +${t.rew} монет`,'👥 К рефералам',()=>{closeGenMo();go('friends');});}
    return;
  }
  if(t.check==='case'){
    openGenMo('Открыть кейс',`Открой любой кейс в Магазине → Кейсы и получи +${t.rew} монет`,'📦 В магазин',()=>{closeGenMo();go('shop');setTimeout(()=>{document.querySelectorAll('.stab')[1]?.click();},300);});
    return;
  }
  if(t.check==='wallet'){
    if(S.walletAddress){completeTask(id);}
    else{openGenMo('Подключи TON кошелёк',`Подключи кошелёк в разделе Профиль и получи +${t.rew} монет`,'💎 К профилю',()=>{closeGenMo();go('profile');});}
    return;
  }
  if(t.check==='sub'){
    openGenMo(''+t.name,`Подпишись на @${t.channel} и вернись — нажми "Проверить подписку"`,
      'Перейти на канал',()=>{
        if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
        closeGenMo();
        setTimeout(()=>showVerifyBtn(t),800);
      }
    );return;
  }
  if(t.check==='chat'){
    openGenMo(''+t.name,`Зайди в @${t.channel}, напиши любое слово и вернись — нажми "Проверить"`,
      'Открыть чат',()=>{
        if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
        closeGenMo();
        setTimeout(()=>showVerifyBtn(t),800);
      }
    );return;
  }
}

function showVerifyBtn(t){
  openGenMo(
    'Проверка задания',
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
  if(t){
    S.balance+=t.rew;
    syncB();
    // Save task reward to transactions
    _addTxLocal('task_reward', `+${t.rew}`, 'Задание выполнено');
    _sendTxToServer('task_reward', `+${t.rew}`, 'Задание выполнено');
  }
  closeGenMo();renderTasks();
  toast(`+${t?.rew||0} монет! 🎉`,'g');
}

/* Send tx to server */
async function _sendTxToServer(type, amount, details){
  try{
    await fetch('/api/transactions/add',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID, type, amount, details})
    });
  }catch{}
}

/* Local tx cache for immediate display */
function _addTxLocal(type, amount, details){
  if(!S.localTx) S.localTx=[];
  const now=new Date();
  const date=now.toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
  S.localTx.unshift({type,amount,details,date});
  if(S.localTx.length>50) S.localTx=S.localTx.slice(0,50);
  save();
  loadTxList();
}
