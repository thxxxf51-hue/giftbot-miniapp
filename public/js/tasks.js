/* ══ TASKS ══ */
const COIN_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const CHECK_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

let _taskOverrides={};
async function fetchTaskOverrides(){
  try{
    const r=await fetch('/api/tasks/overrides');
    _taskOverrides=await r.json();
  }catch{_taskOverrides={};}
}

let pendingVerifyTask=null;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&pendingVerifyTask){
    const t=pendingVerifyTask;
    pendingVerifyTask=null;
    setTimeout(()=>showVerifyBtn(t),350);
  }
});

const DONE_TOAST_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="#00FFA3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const WIP_TOAST_ICO=`<svg viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

function renderTasks(){
  const wrap=document.createElement('div');
  wrap.className='tlist';
  // Apply overrides to each task
  const tasksWithOv=TASKS.map(t=>{
    const ov=_taskOverrides[t.id]||{};
    return{...t,...ov};
  });
  // Sort: done tasks last, then by order, then new first
  tasksWithOv.sort((a,b)=>{
    const aDone=S.doneTasks.has(a.id)?1:0;
    const bDone=S.doneTasks.has(b.id)?1:0;
    if(aDone!==bDone)return aDone-bDone;
    const ao=a.order!=null?a.order:9999;
    const bo=b.order!=null?b.order:9999;
    if(ao!==bo)return ao-bo;
    return(b.isNew?1:0)-(a.isNew?1:0);
  });
  tasksWithOv.forEach(t=>{
    const done=S.doneTasks.has(t.id);
    const card=document.createElement('div');
    const isNew=!!t.isNew;
    card.className='tc'+(t.wip?' tc--wip':'')+(done?' tc--done':'')+(isNew?' tc--new':'');
    if(t.borderColor){
      card.style.border=`1px solid ${t.borderColor}`;
      card.style.boxShadow=`inset 0 0 18px ${t.borderColor}`;
    }
    card.onclick=()=>openTask(t.id);

    // Support hex color in tc field
    let tags;
    if(t.tc&&t.tc.startsWith('#')){
      tags=`<div class="tc-tag" style="background:${t.tc}22;color:${t.tc};border:1px solid ${t.tc}44">${t.tag}</div>`;
    }else{
      tags=`<div class="tc-tag tc-tag--${t.tc}">${t.tag}</div>`;
    }
    const newColor=t.newTagColor;
    if(isNew)  tags+=newColor
      ?`<div class="tc-tag tc-tag--new" style="background:${newColor}30;color:${newColor}">NEW</div>`
      :`<div class="tc-tag tc-tag--new">NEW</div>`;
    if(done)   tags+=`<div class="tc-tag tc-tag--done">Выполнено</div>`;
    if(t.wip)  tags+=`<div class="tc-tag tc-tag--wip">В разработке</div>`;

    const rew=`<div class="tc-rew">${COIN_ICO} ${t.rew.toLocaleString('ru')}</div>`;

    // Динамический прогресс для реферальных заданий (всегда, даже если выполнено)
    let prog=t.prog||null;
    if(t.check==='ref'){
      const cnt=S.refs?S.refs.length:0;
      if(cnt<3)      prog={cur:cnt,max:3};
      else if(cnt<5) prog={cur:cnt,max:5};
      else           prog={cur:5,max:5};
    }

    let pct=0;
    if(prog!=null){ pct=Math.min(100,Math.round((prog.cur/prog.max)*100)); }
    else if(done){ pct=100; }

    let bottom='';
    if(prog!=null){
      const isFull=prog.cur>=prog.max;
      const fillClass='tc-prog-fill'+(isFull?' prog-full':'');
      const progTxt=`<div class="tc-prog-txt">${prog.cur} / ${prog.max}${prog.unit?' '+prog.unit:''}</div>`;
      bottom=`<div class="tc-prog-bar"><div class="${fillClass}" style="width:${pct}%"></div></div>${progTxt}`;
    } else if(done){
      bottom=`<div class="tc-done-lbl">${CHECK_ICO} Выполнено</div>`;
    }
    if(done && t.check==='ref'){
      bottom+=`<div class="tc-done-lbl">${CHECK_ICO} Выполнено</div>`;
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
  const base=TASKS.find(x=>x.id===id);if(!base)return;
  const t={...base,...(_taskOverrides[id]||{})};
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
    // Задание выполняется только при активном подключении кошелька (не из кеша)
    _openTaskModal(t,'К профилю',()=>{closeGenMo();go('profile');});
    return;
  }
  if(t.check==='sub'){
    _openTaskModal(t,'Перейти на канал',()=>{
      pendingVerifyTask=t;
      if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
      closeTaskMo();
    });
    return;
  }
  if(t.check==='chat'){
    _openTaskModal(t,'Открыть чат',()=>{
      pendingVerifyTask=t;
      if(tg)tg.openTelegramLink(t.url);else window.open(t.url,'_blank');
      closeTaskMo();
    });
    return;
  }
}

function showVerifyBtn(t){
  const mo=document.getElementById('genmo');
  const box=mo.querySelector('.modal-box');
  if(!box._origHTML) box._origHTML=box.innerHTML;
  box.classList.add('tm-modal-box');

  const desc=t.check==='sub'
    ?`Подписался ли ты на @${t.channel}?`
    :`Написал ли ты слово в @${t.channel}?`;

  function renderVerify(error){
    const errHtml=error
      ?`<div style="background:rgba(255,60,60,.12);border:1px solid rgba(255,60,60,.3);border-radius:12px;padding:11px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;color:#ff5555;font-size:14px;font-weight:700">${_X_SVG} ${error}</div>`
      :'';
    box.innerHTML=`
      <div class="tm-hdr">
        <div class="tm-title">Проверка задания</div>
        <button class="tm-x" onclick="closeTaskMo()">${_X_SVG}</button>
      </div>
      <div class="tm-sep"></div>
      <div class="tm-body">
        ${errHtml}
        <div class="tm-desc">${desc}</div>
        <button class="tm-act tm-act--go" id="tm-verify-btn">✅ Проверить</button>
        <button class="tm-cancel" onclick="closeTaskMo()">Ещё не выполнил</button>
      </div>`;
    box.querySelector('#tm-verify-btn').onclick=()=>doVerify();
  }

  async function doVerify(){
    const btn=box.querySelector('#tm-verify-btn');
    if(btn){btn.textContent='Проверяем...';btn.disabled=true;}
    try{
      if(t.check==='sub'){
        const r=await fetch('/api/check-sub',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:UID,channel:t.channel})});
        const d=await r.json();
        if(d.subscribed){completeTask(t.id);}
        else{renderVerify('Не подписался');}
      } else if(t.check==='chat'){
        const r=await fetch('/api/check-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:UID,channel:t.channel})});
        const d=await r.json();
        if(d.member){completeTask(t.id);}
        else{renderVerify('Ты не написал слово в чат');}
      }
    }catch(e){
      renderVerify('Ошибка проверки. Попробуй ещё раз');
    }
  }

  renderVerify(null);
  mo.onclick=(e)=>{if(e.target===mo)closeTaskMo();};
  mo.classList.add('show');
}

async function verifyTask(t){
  const uid=UID;
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
}

function completeTask(id){
  S.doneTasks.add(id);
  const t=TASKS.find(x=>x.id===id);
  if(t){
    S.balance+=t.rew;
    syncB();
    // Save tx only on server — no local copy to avoid duplicates
    _sendTxToServer('task_reward', `+${t.rew}`, 'Задание выполнено').then(()=>loadTxList());
    // Записываем в глобальную статистику
    fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:t.rew})}).catch(()=>{});
  }
  closeGenMo();renderTasks();
  const coinSvg=`<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
  toast(`+${t?.rew||0} монет!`,'g',coinSvg);
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

/* Local tx — used only for non-task events (promos, etc) */

/* Local tx cache for immediate display */
function _addTxLocal(type, amount, details){
  if(!S.localTx) S.localTx=[];
  const now=new Date();
  const date=now.toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
  const txId='tx_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  S.localTx.unshift({id:txId,type,amount,details,date});
  if(S.localTx.length>50) S.localTx=S.localTx.slice(0,50);
  save();
  loadTxList();
}
