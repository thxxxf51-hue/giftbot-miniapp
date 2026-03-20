/* ══ TASKS ══ */
const COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const CHECK_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const DONE_TOAST_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="#00FFA3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const WIP_TOAST_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

function renderTasks(){
  const wrap=document.createElement('div');
  wrap.className='tlist';
  TASKS.forEach(t=>{
    const done=S.doneTasks.has(t.id);
    const card=document.createElement('div');
    card.className='tc'+(t.wip?' tc--wip':'')+(done?' tc--done':'');
    card.onclick=()=>openTask(t.id);

    let tags=`<div class="tc-tag tc-tag--${t.tc}">${t.tag}</div>`;
    if(t.isNew) tags+=`<div class="tc-tag tc-tag--new">NEW</div>`;
    if(done)    tags+=`<div class="tc-tag tc-tag--done">Выполнено</div>`;
    if(t.wip)   tags+=`<div class="tc-tag tc-tag--wip">В разработке</div>`;

    const rew=`<div class="tc-rew">${COIN_ICO} ${t.rew.toLocaleString('ru')}</div>`;

    let pct=0;
    if(done){ pct=100; }
    else if(t.prog!=null){ pct=Math.min(100,Math.round((t.prog.cur/t.prog.max)*100)); }

    let bottom='';
    if(done){
      bottom=`<div class="tc-done-lbl">${CHECK_ICO} Выполнено</div>`;
    } else if(t.prog!=null){
      const progTxt=`<div class="tc-prog-txt">${t.prog.cur} / ${t.prog.max}${t.prog.unit?' '+t.prog.unit:''}</div>`;
      bottom=`<div class="tc-prog-bar"><div class="tc-prog-fill" style="width:${pct}%"></div></div>${progTxt}`;
    }

    card.innerHTML=`
      <div class="tc-top"><div class="tc-tags">${tags}</div>${rew}</div>
      <div class="tc-name">${t.name}</div>
      <div class="tc-desc">${t.desc}</div>
      ${bottom}`;
    wrap.appendChild(card);
  });
  document.getElementById('tasks-list').innerHTML='';
  document.getElementById('tasks-list').appendChild(wrap);
}

const _CHECK_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const _X_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function closeTaskMo(){
  const mo=document.getElementById('genmo');
  mo.classList.remove('show');
  mo.onclick=(e)=>{if(e.target===mo)closeGenMo();};
  const box=mo.querySelector('.modal-box');
  setTimeout(()=>{
    box.classList.remove('tm-modal-box');
    if(box._origHTML){box.innerHTML=box._origHTML;box._origHTML=null;}
  },280);
}

function _openTaskModal(t, btnText, action){
  const done=S.doneTasks.has(t.id);
  const mo=document.getElementById('genmo');
  const box=mo.querySelector('.modal-box');
  if(!box._origHTML) box._origHTML=box.innerHTML;
  box.classList.add('tm-modal-box');

  const cancelRow=done?'':
    `<button class="tm-cancel" onclick="closeTaskMo()">Отмена</button>`;
  const actClass=done?'tm-act tm-act--done':'tm-act tm-act--go';
  const actContent=done?`${_CHECK_SVG} Награда получена`:btnText;

  box.innerHTML=`
    <div class="tm-hdr">
      <div class="tm-title">${t.name}</div>
      <button class="tm-x" onclick="closeTaskMo()">${_X_SVG}</button>
    </div>
    <div class="tm-sep"></div>
    <div class="tm-body">
      <div class="tm-desc">${t.desc}</div>
      <div class="tm-rew-box">${COIN_ICO} <span>${t.rew.toLocaleString('ru')}</span></div>
      <button class="${actClass}" id="tm-main-btn">${actContent}</button>
      ${cancelRow}
    </div>`;

  if(!done && action){
    box.querySelector('#tm-main-btn').onclick=action;
  } else {
    box.querySelector('#tm-main-btn').onclick=closeTaskMo;
  }

  mo.onclick=(e)=>{if(e.target===mo)closeTaskMo();};
  mo.classList.add('show');
}

function openTask(id){
  const t=TASKS.find(x=>x.id===id);if(!t)return;
  if(t.wip){toast('Задание в разработке','s',WIP_TOAST_ICO);return;}
  const done=S.doneTasks.has(id);
  if(t.check==='ref'){
    if(!done&&S.refs.length>0){completeTask(id);return;}
    _openTaskModal(t,'К рефералам',()=>{closeGenMo();go('friends');});
    return;
  }
  if(t.check==='case'){
    if(done){_openTaskModal(t,'',null);return;}
    _openTaskModal(t,'В магазин',()=>{closeGenMo();go('shop');setTimeout(()=>{document.querySelectorAll('.stab')[1]?.click();},300);});
    return;
  }
  if(t.check==='wallet'){
    if(!done&&S.walletAddress){completeTask(id);return;}
    _openTaskModal(t,'К профилю',()=>{closeGenMo();go('profile');});
    return;
  }
  if(t.check==='sub'){
    _openTaskModal(t,'Перейти на канал',()=>{
      if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
      closeGenMo();
      setTimeout(()=>showVerifyBtn(t),800);
    });
    return;
  }
  if(t.check==='chat'){
    _openTaskModal(t,'Открыть чат',()=>{
      if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
      closeGenMo();
      setTimeout(()=>showVerifyBtn(t),800);
    });
    return;
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
    // Записываем в глобальную статистику
    fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:t.rew})}).catch(()=>{});
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
