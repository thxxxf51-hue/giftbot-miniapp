/* ══ DRAWS ══ */
let curRaffleTab='active';
let _activeDraw=null;

function raffleTab(tab,btn){
  curRaffleTab=tab;
  document.querySelectorAll('#page-raffles .stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('raffles-active').style.display=tab==='active'?'block':'none';
  document.getElementById('raffles-finished').style.display=tab==='finished'?'block':'none';
  if(tab==='finished')loadFinishedDraws();
}

async function loadDraws(){
  try{
    const r=await fetch('/api/draws');
    const d=await r.json();
    if(d.ok)renderDraws(d.draws||[]);
  }catch{}
}

async function loadFinishedDraws(){
  try{
    const r=await fetch('/api/draws/finished');
    const d=await r.json();
    if(d.ok)renderFinishedDraws(d.draws||[]);
  }catch{}
}

function _drawTimeLeft(endsAt){
  const left=Math.ceil((endsAt-Date.now())/60000);
  if(left>=1440){const d=Math.floor(left/1440),h=Math.floor((left%1440)/60);return h>0?`${d}д ${h}ч`:`${d}д`;}
  if(left>=60){const h=Math.floor(left/60),m=left%60;return m>0?`${h}ч ${m}м`:`${h}ч`;}
  if(left<1)return'< 1 мин';
  return`${left} мин`;
}

function renderDraws(draws){
  const active=draws.filter(d=>d.endsAt>Date.now());
  const cont=document.getElementById('raffles-active');if(!cont)return;
  const empty=document.getElementById('raffles-empty');
  cont.querySelectorAll('.draw-grid,.draw-card').forEach(e=>e.remove());
  if(!active.length){if(empty)empty.style.display='';renderHomeDraws([]);return;}
  if(empty)empty.style.display='none';

  const grid=document.createElement('div');
  grid.className='draw-grid';

  active.forEach(draw=>{
    const isJoined=(S.joinedDraws||[]).includes(draw.id);
    const tl=_drawTimeLeft(draw.endsAt);
    const COIN=`<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
    const el=document.createElement('div');
    el.className='draw-card-v2';
    el.onclick=()=>openDrawDetail(draw);
    const imgHtml=draw.imageUrl
      ?`<img src="${draw.imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block">`
      :`<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a2e1a,#0d1f14);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;opacity:.4"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg></div>`;
    el.innerHTML=`
      <div class="draw-card-img">
        ${imgHtml}
        ${isJoined?'<div class="draw-card-badge">✓ Участвуете</div>':''}
        <div class="draw-card-overlay">
          <div class="draw-card-title">${draw.prize}${draw.isMoney?` ${COIN}`:''}</div>
        </div>
      </div>
      <div class="draw-card-footer">
        <div class="draw-card-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${tl}
        </div>
        <div class="draw-card-parts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;flex-shrink:0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          ${draw.participantsCount}
        </div>
      </div>`;
    grid.appendChild(el);
  });
  cont.appendChild(grid);
  renderHomeDraws(active);
}

/* ── Active draw detail modal ── */
let _partsVisible=false;
function openDrawDetail(draw){
  _activeDraw=draw;
  _partsVisible=false;
  const mo=document.getElementById('draw-detail-mo');
  if(!mo)return;
  const tl=_drawTimeLeft(draw.endsAt);
  const wc=draw.winnersCount||1;
  const isJoined=(S.joinedDraws||[]).includes(draw.id);
  const conds=draw.conditions||[];
  const tgConds=conds.filter(c=>c.type==='tg');
  const kickConds=conds.filter(c=>c.type==='kick');
  const customConds=conds.filter(c=>c.type==='custom');
  const COIN=`<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
  document.getElementById('draw-detail-title').textContent=draw.prize+(draw.isMoney?' монет':'');
  let html='';
  if(draw.imageUrl){
    html+=`<img src="${draw.imageUrl}" style="width:100%;border-radius:14px;margin-bottom:14px;object-fit:cover;max-height:190px;display:block">`;
  }
  if(draw.description){
    html+=`<div class="draw-desc-text">${draw.description.replace(/\n/g,'<br>')}</div>`;
  }
  html+=`<div class="draw-prize-block">
    <div class="draw-prize-lbl">ПРИЗ</div>
    <div class="draw-prize-val">${draw.prize}${draw.isMoney?` ${COIN}`:''}</div>
  </div>`;
  html+=`<div class="draw-stats-row">
    <div class="draw-stat-box"><div class="draw-stat-val">${tl}</div><div class="draw-stat-lbl">Осталось</div></div>
    <div class="draw-stat-box"><div class="draw-stat-val">${draw.participantsCount}</div><div class="draw-stat-lbl">Участников</div></div>
    <div class="draw-stat-box"><div class="draw-stat-val">${wc}</div><div class="draw-stat-lbl">Победителей</div></div>
  </div>`;
  if(conds.length>0){
    html+=`<div class="draw-reqs-block"><div class="draw-reqs-title">Требования для участия</div>`;
    if(tgConds.length>0){
      html+=`<div class="draw-reqs-subtitle">Telegram каналы</div>`;
      tgConds.forEach((c,i)=>{
        const st=draw._tgSubStatus&&draw._tgSubStatus[i];
        const url=c.url||`https://t.me/${(c.channel||'').replace('@','')}`;
        html+=`<div class="draw-req-row">
          <div class="draw-req-status ${st?'ok':'no'}">${st?'✓':'✗'}</div>
          <div class="draw-req-name">${c.name||c.channel}</div>
          ${!st?`<a class="draw-req-sub-btn" onclick="(window.tg?tg.openTelegramLink('${url}'):window.open('${url}','_blank'));event.preventDefault()">Подписаться ↗</a>`:''}
        </div>`;
      });
      html+=`<button class="draw-check-btn" id="draw-tg-check-btn" onclick="checkDrawSubsTG(${draw.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Проверить подписки
      </button>`;
    }
    if(kickConds.length>0){
      html+=`<div class="draw-reqs-subtitle" style="margin-top:10px">Kick каналы</div>`;
      kickConds.forEach(c=>{
        const url=c.url||`https://kick.com/${c.channel||''}`;
        html+=`<div class="draw-req-row">
          <div class="draw-req-status no">↗</div>
          <div class="draw-req-name">${c.name||c.channel}</div>
          <a class="draw-req-sub-btn" onclick="window.open('${url}','_blank');event.preventDefault()">Перейти ↗</a>
        </div>`;
      });
    }
    if(customConds.length>0){
      if(tgConds.length||kickConds.length)html+=`<div class="draw-reqs-subtitle" style="margin-top:10px">Другие условия</div>`;
      customConds.forEach(c=>{
        html+=`<div class="draw-req-row"><div class="draw-req-status no">!</div><div class="draw-req-name">${c.text||''}</div></div>`;
      });
    }
    html+=`</div>`;
  }
  if(isJoined){
    html+=`<div class="draw-joined-status">
      <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
      Вы уже участвуете в этом розыгрыше
    </div>`;
  }else{
    const isTkt=draw.requireTicket;
    html+=`<button class="${isTkt?'draw-join-btn draw-join-btn--ticket':'draw-join-btn'}" id="draw-join-btn" onclick="joinDrawDetail(${draw.id})">${isTkt?'Участвовать (нужен билет)':'Участвовать'}</button>`;
  }
  html+=`<button class="draw-parts-btn" id="active-parts-btn" onclick="showActiveDrawParts(${draw.id})">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    <span>Показать участников (${draw.participantsCount})</span>
    <svg class="parts-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;margin-left:auto;transition:transform .25s"><polyline points="6 9 12 15 18 9"/></svg>
  </button>`;
  html+=`<div id="draw-active-parts-panel" class="draw-parts-panel" style="display:none"></div>`;
  html+=`<button class="draw-share-btn" onclick="shareDrawDetail(${draw.id})">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    Поделиться
  </button>`;
  document.getElementById('draw-detail-body').innerHTML=html;
  mo.classList.add('show');
  _initDrawDetailSwipe();
}

function closeDrawDetail(){
  const box=document.getElementById('draw-detail-box');
  if(!box)return;
  box.style.transition='transform .28s cubic-bezier(.4,0,.2,1)';
  box.style.transform='translateY(100%)';
  setTimeout(()=>{
    const mo=document.getElementById('draw-detail-mo');
    if(mo)mo.classList.remove('show');
    box.style.transition='';box.style.transform='';
  },280);
}

function _initDrawDetailSwipe(){
  const box=document.getElementById('draw-detail-box');
  const drag=document.getElementById('draw-detail-drag');
  if(!box||!drag)return;
  let sY=0,cY=0,dr=false;
  function onS(e){sY=e.touches?e.touches[0].clientY:e.clientY;cY=0;dr=true;box.style.transition='none';}
  function onM(e){if(!dr)return;const y=(e.touches?e.touches[0].clientY:e.clientY)-sY;if(y<0)return;cY=y;box.style.transform=`translateY(${y}px)`;const mo=document.getElementById('draw-detail-mo');if(mo)mo.style.background=`rgba(0,0,0,${Math.max(0,0.82-y/400)})`;}
  function onE(){if(!dr)return;dr=false;const mo=document.getElementById('draw-detail-mo');if(cY>110){closeDrawDetail();if(mo)mo.style.background='';}else{box.style.transition='transform .22s cubic-bezier(.4,0,.2,1)';box.style.transform='translateY(0)';if(mo)mo.style.background='';}}
  const nd=drag.cloneNode(true);
  drag.parentNode.replaceChild(nd,drag);
  nd.addEventListener('touchstart',onS,{passive:true});nd.addEventListener('touchmove',onM,{passive:true});nd.addEventListener('touchend',onE);
  nd.addEventListener('mousedown',onS);document.addEventListener('mousemove',onM);document.addEventListener('mouseup',onE);
}

async function checkDrawSubsTG(drawId){
  const btn=document.getElementById('draw-tg-check-btn');
  if(btn){btn.textContent='Проверяем...';btn.disabled=true;}
  try{
    const r=await fetch('/api/draws/check-tg-subs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drawId,userId:UID})});
    const d=await r.json();
    if(d.ok&&_activeDraw){_activeDraw._tgSubStatus=d.status;openDrawDetail(_activeDraw);}
    else{if(btn){btn.textContent='Проверить подписки';btn.disabled=false;}toast(d.error||'Ошибка проверки','r');}
  }catch{if(btn){btn.textContent='Проверить подписки';btn.disabled=false;}toast('Ошибка соединения','r');}
}

async function joinDrawDetail(drawId){
  const btn=document.getElementById('draw-join-btn');
  if(btn){btn.disabled=true;btn.textContent='Участвуем...';}
  const draw=_activeDraw||{};
  const requireTicket=draw.requireTicket||false;
  try{
    if(requireTicket){
      const tickets=S.inventory&&S.inventory['ticket']||0;
      if(tickets<1){if(btn){btn.disabled=false;btn.textContent='Участвовать (нужен билет)';}toast('Нет билета. Купи в магазине!','r');return;}
    }
    const r=await fetch('/api/draws/join',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({drawId,userId:UID,username:TGU.username,firstName:TGU.first_name,useTicket:true})});
    const d=await r.json();
    if(d.ok){
      if(!S.joinedDraws)S.joinedDraws=[];
      if(!S.joinedDraws.includes(drawId))S.joinedDraws.push(drawId);
      save();
      if(requireTicket&&S.inventory)S.inventory['ticket']=Math.max(0,(S.inventory['ticket']||1)-1);
      closeDrawDetail();toast('Вы участвуете!','g');loadDraws();
    }else{
      toast(d.errorText||d.error||'Ошибка','r');
      if(btn){btn.disabled=false;btn.textContent=requireTicket?'Участвовать (нужен билет)':'Участвовать';}
    }
  }catch{toast('Ошибка','r');if(btn)btn.disabled=false;}
}

/* ── Active draw participants panel ── */
async function showActiveDrawParts(drawId){
  const panel=document.getElementById('draw-active-parts-panel');
  const btn=document.getElementById('active-parts-btn');
  const arrow=btn?btn.querySelector('.parts-arrow'):null;
  if(!panel)return;
  const count=_activeDraw?_activeDraw.participantsCount:0;
  if(_partsVisible){
    panel.style.display='none';
    _partsVisible=false;
    if(arrow)arrow.style.transform='rotate(0deg)';
    btn.querySelector('span').textContent=`Показать участников (${count})`;
    return;
  }
  panel.innerHTML=`<div style="text-align:center;padding:14px;color:var(--muted2);font-size:13px">Загрузка...</div>`;
  panel.style.display='block';
  _partsVisible=true;
  if(arrow)arrow.style.transform='rotate(180deg)';
  btn.querySelector('span').textContent='Скрыть участников';
  try{
    const r=await fetch(`/api/draws/${drawId}/participants`);
    const d=await r.json();
    if(!d.ok||!d.participants.length){
      panel.innerHTML=`<div class="dp-empty" style="padding:16px"><div class="dp-empty-t">Участников пока нет</div></div>`;return;
    }
    _renderPartsPanel(panel,d.participants,[]);
  }catch{
    panel.innerHTML=`<div style="text-align:center;padding:12px;color:var(--muted2);font-size:12px">Ошибка загрузки</div>`;
  }
}

function _renderPartsPanel(panel,participants,winnerNames){
  const wSet=new Set(winnerNames);
  const ICON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;color:rgba(255,255,255,.35)"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
  panel.innerHTML=`
    <div class="dpp-header">Участники розыгрыша:</div>
    <div class="dpp-list">
      ${participants.map(p=>{
        const fn=p.firstName||(p.name&&!p.name.startsWith('@')?p.name:null);
        const un=p.username||(p.name&&p.name.startsWith('@')?p.name.slice(1):null);
        const label=fn&&un?`${fn} @${un}`:fn||un?`${fn||''}${un?'@'+un:''}`:'Аноним';
        const isW=wSet.has(p.name||'');
        return`<div class="dpp-row${isW?' dpp-row--winner':''}">
          ${ICON}
          <span class="dpp-name">${label}</span>
          ${isW?'<span class="dpp-medal">👑</span>':''}
        </div>`;
      }).join('')}
    </div>`;
}

function shareDrawDetail(drawId){
  const draw=_activeDraw;if(!draw)return;
  const text=`🎁 Розыгрыш: ${draw.prize}${draw.isMoney?' монет':''}!\nУчаствуй в SatApp Gifts → `;
  const drawUrl=`https://t.me/SATapp_bot/app?startapp=draw_${drawId}`;
  if(window.tg&&tg.openTelegramLink)tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(drawUrl)}&text=${encodeURIComponent(text)}`);
  else if(navigator.share)navigator.share({title:'SatApp Gifts',text:text,url:drawUrl}).catch(()=>{});
}

/* ── Finished draws list (2-col grid, compact cards) ── */
function renderFinishedDraws(draws){
  const cont=document.getElementById('raffles-finished');if(!cont)return;
  const empty=document.getElementById('raffles-fin-empty');
  cont.querySelectorAll('.fin-grid').forEach(e=>e.remove());
  if(!draws.length){if(empty)empty.style.display='';return;}
  if(empty)empty.style.display='none';

  const grid=document.createElement('div');
  grid.className='fin-grid';
  draws.forEach(draw=>{
    const pc=(draw.participants||[]).length;
    const el=document.createElement('div');
    el.className='fin-card-v2';
    el.onclick=()=>openDpMo(draw);
    const imgHtml=draw.imageUrl
      ?`<img src="${draw.imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block">`
      :`<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a2e1a,#0d1f14);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;opacity:.3"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg></div>`;
    const title=draw.prize+(draw.isMoney?' монет':'');
    el.innerHTML=`
      <div class="fin-card-img">
        ${imgHtml}
        <div class="fin-card-badge">Завершён</div>
      </div>
      <div class="fin-card-info">
        <div class="fin-card-title">${title}</div>
      </div>
      <div class="fin-card-footer">
        <span class="fin-card-status">Завершён</span>
        <div class="fin-card-count">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          ${pc}
        </div>
      </div>`;
    grid.appendChild(el);
  });
  cont.appendChild(grid);
}

/* ── Home draws compact card ── */
let _homeDrawsCache=[];
function renderHomeDraws(draws){
  _homeDrawsCache=draws;
  const el=document.getElementById('h-raf-block');if(!el)return;
  if(!draws.length){
    el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;padding:24px;opacity:.35;gap:8px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:34px;height:34px;color:var(--green)"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
      <div style="font-size:12px;color:var(--muted)">Пока розыгрышей нет</div>
    </div>`;
    return;
  }
  el.innerHTML=draws.slice(0,3).map((d,i)=>{
    const leftMs=Math.max(0,d.endsAt-Date.now());
    const h=Math.floor(leftMs/3600000);
    const m=Math.floor((leftMs%3600000)/60000);
    const timeStr=leftMs>0?`${h}ч ${String(m).padStart(2,'0')}м`:'Завершается';
    const imgHtml=d.imageUrl
      ?`<img src="${d.imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:13px 13px 0 0">`
      :`<div style="width:100%;height:100%;background:linear-gradient(135deg,#0d1f14,#1a2e1a);display:flex;align-items:center;justify-content:center;border-radius:13px 13px 0 0"><svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;opacity:.3"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg></div>`;
    return `<div class="h-draw-card" onclick="openHomeDrawCard(${i})">
      <div class="h-draw-card-img">${imgHtml}</div>
      <div class="h-draw-card-body">
        <div class="h-draw-card-title">${d.prize}${d.isMoney?' монет':''}</div>
        <div class="h-draw-card-timer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${timeStr}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openHomeDrawCard(idx){
  const draw=_homeDrawsCache[idx];
  if(!draw)return;
  go('raffles');
  setTimeout(()=>openDrawDetail(draw),120);
}

/* ── Finished draw detail modal (dp-mo, NO TABS) ── */
let _dpDraw=null;
let _dpPartsVisible=false;

function openDpMo(draw){
  _dpDraw=draw;
  _dpPartsVisible=false;
  const mo=document.getElementById('dp-mo');if(!mo)return;

  const wc=draw.winnersCount||1;
  const pc=(draw.participants||[]).length;
  const winners=draw.winners||[];
  const conds=draw.conditions||[];
  const COIN=`<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;

  document.getElementById('dp-title').textContent=draw.prize+(draw.isMoney?' монет':'');
  document.getElementById('dp-prize').textContent='';

  let html='';

  /* image */
  if(draw.imageUrl){
    html+=`<img src="${draw.imageUrl}" style="width:100%;border-radius:13px;object-fit:cover;max-height:200px;display:block;margin-bottom:12px">`;
  }

  /* description */
  if(draw.description){
    html+=`<div class="draw-desc-text">${draw.description.replace(/\n/g,'<br>')}</div>`;
  }

  /* prize */
  html+=`<div class="dpm-prize-block">
    <div class="dpm-prize-lbl">ПРИЗ</div>
    <div class="dpm-prize-val">${draw.prize}${draw.isMoney?` ${COIN}`:''}</div>
  </div>`;

  /* stats */
  html+=`<div class="dpm-stats-row">
    <div class="dpm-stat-box" style="flex:.38">
      <div class="dpm-stat-lbl">Статус</div>
      <div class="dpm-stat-val dpm-stat-val--done">Завершён</div>
    </div>
    <div class="dpm-stat-box">
      <div class="dpm-stat-lbl">Участников</div>
      <div class="dpm-stat-val">${pc}</div>
    </div>
    <div class="dpm-stat-box">
      <div class="dpm-stat-lbl">Победители</div>
      <div class="dpm-stat-val">${wc}</div>
    </div>
  </div>`;

  /* requirements */
  if(conds.length>0){
    html+=`<div class="dpm-reqs-block">
      <div class="dpm-block-lbl">Требования для участия</div>
      ${conds.map(c=>`<div class="dpm-req-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;opacity:.5;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${c.name||c.channel||c.text||''}</span>
      </div>`).join('')}
    </div>`;
  }

  /* winners */
  html+=`<div class="dpm-winners-block">
    <div class="dpm-block-lbl" style="color:#3fbb6d">
      <svg viewBox="0 0 24 24" fill="none" stroke="#3fbb6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><path d="M8 21h8M12 17v4M7 4H4v3c0 2.21 1.79 4 4 4M17 4h3v3c0 2.21-1.79 4-4 4M12 17c-3.87 0-7-3.13-7-7V4h14v6c0 3.87-3.13 7-7 7z"/></svg>
      Победители
    </div>
    ${winners.length?winners.map((w,i)=>`<div class="dpm-winner-row">
      <span class="dpm-winner-medal">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'👑'}</span>
      <span class="dpm-winner-name">${w.name}</span>
      ${draw.isMoney?`<span class="dpm-winner-amt">+${Math.floor(parseInt(draw.prize)/wc)} ${COIN}</span>`:''}
    </div>`).join('')
    :`<div style="font-size:12px;color:var(--muted2);padding:4px 0">Победители не определены</div>`}
  </div>`;

  /* participants toggle */
  html+=`<button class="dpm-parts-btn" id="dpm-parts-toggle" onclick="toggleDpmParts()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    <span>Показать участников (${pc})</span>
    <svg class="parts-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;margin-left:auto;transition:transform .25s"><polyline points="6 9 12 15 18 9"/></svg>
  </button>`;
  html+=`<div id="dpm-parts-panel" style="display:none"></div>`;

  /* share */
  html+=`<button class="dpm-share-btn" onclick="shareDpMoDraw()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    Поделиться
  </button>`;

  document.getElementById('dp-body').innerHTML=html;
  mo.classList.add('show');
  _initDpSwipe();
}

function toggleDpmParts(){
  const panel=document.getElementById('dpm-parts-panel');
  const btn=document.getElementById('dpm-parts-toggle');
  const arrow=btn?btn.querySelector('.parts-arrow'):null;
  if(!panel||!_dpDraw)return;
  const pc=(_dpDraw.participants||[]).length;
  if(_dpPartsVisible){
    panel.style.display='none';
    _dpPartsVisible=false;
    if(arrow)arrow.style.transform='rotate(0deg)';
    if(btn)btn.querySelector('span').textContent=`Показать участников (${pc})`;
    return;
  }
  _dpPartsVisible=true;
  if(arrow)arrow.style.transform='rotate(180deg)';
  if(btn)btn.querySelector('span').textContent='Скрыть участников';
  const parts=_dpDraw.participants||[];
  if(!parts.length){
    panel.innerHTML=`<div class="dp-empty" style="padding:16px"><div class="dp-empty-t">Участников нет</div></div>`;
    panel.style.display='block';return;
  }
  const winnerNames=(_dpDraw.winners||[]).map(w=>w.name);
  _renderPartsPanel(panel,parts.map(p=>({
    firstName:p.firstName||(p.name&&!p.name.startsWith('@')?p.name:null),
    username:p.username||(p.name&&p.name.startsWith('@')?p.name.slice(1):null),
    name:p.name
  })),winnerNames);
  panel.style.display='block';
}

function shareDpMoDraw(){
  if(!_dpDraw)return;
  const text=`🎁 Розыгрыш: ${_dpDraw.prize}${_dpDraw.isMoney?' монет':''}!\nУчаствуй в SatApp Gifts → `;
  const drawUrl=`https://t.me/SATapp_bot/app?startapp=draw_${_dpDraw.id}`;
  if(window.tg&&tg.openTelegramLink)tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(drawUrl)}&text=${encodeURIComponent(text)}`);
  else if(navigator.share)navigator.share({title:'SatApp Gifts',text:text,url:drawUrl}).catch(()=>{});
}

function closeDpMo(){
  const box=document.getElementById('dp-box');
  box.style.transition='transform .28s cubic-bezier(.4,0,.2,1)';
  box.style.transform='translateY(100%)';
  setTimeout(()=>{document.getElementById('dp-mo').classList.remove('show');box.style.transition='';box.style.transform='';},280);
}

/* keep dpTab for backward compat */
function dpTab(tab,btn){}
function _renderDpBody(tab){}

function _initDpSwipe(){
  const box=document.getElementById('dp-box');const dragWrap=document.getElementById('dp-drag-wrap');
  if(!box||!dragWrap)return;
  let sY=0,cY=0,dr=false;
  function onS(e){sY=e.touches?e.touches[0].clientY:e.clientY;cY=0;dr=true;box.style.transition='none';}
  function onM(e){if(!dr)return;const y=(e.touches?e.touches[0].clientY:e.clientY)-sY;if(y<0)return;cY=y;box.style.transform=`translateY(${y}px)`;document.getElementById('dp-mo').style.background=`rgba(0,0,0,${Math.max(0,0.82-y/400)})`;}
  function onE(){if(!dr)return;dr=false;if(cY>110){closeDpMo();document.getElementById('dp-mo').style.background='';}else{box.style.transition='transform .22s cubic-bezier(.4,0,.2,1)';box.style.transform='translateY(0)';document.getElementById('dp-mo').style.background='';}}
  const nd=dragWrap.cloneNode(true);dragWrap.parentNode.replaceChild(nd,dragWrap);
  nd.addEventListener('touchstart',onS,{passive:true});nd.addEventListener('touchmove',onM,{passive:true});nd.addEventListener('touchend',onE);
  nd.addEventListener('mousedown',onS);document.addEventListener('mousemove',onM);document.addEventListener('mouseup',onE);
}
