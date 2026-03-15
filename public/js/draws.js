/* ══ DRAWS ══ */
let curRaffleTab='active';

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

function renderDraws(draws){
  const active=draws.filter(d=>d.endsAt>Date.now());
  const cont=document.getElementById('raffles-active');if(!cont)return;
  const empty=document.getElementById('raffles-empty');
  cont.querySelectorAll('.draw-card').forEach(e=>e.remove());
  if(!active.length){if(empty)empty.style.display='';renderHomeDraws([]);return;}
  if(empty)empty.style.display='none';
  active.forEach(draw=>{
    const el=document.createElement('div');
    el.className='gc draw-card';el.style.cssText='padding:14px;margin-bottom:10px';
    const left=Math.ceil((draw.endsAt-Date.now())/60000);
    const tl=left>=1440?Math.floor(left/1440)+' дн.':left>=60?Math.floor(left/60)+' ч.':left+' мин.';
    const wc=draw.winnersCount||1;
    const ticketBadge=draw.requireTicket?`<div class="ticket-badge">🎟 Только с билетом</div>`:'';
    const joinBtnStyle=draw.requireTicket
      ?`style="width:100%;background:rgba(255,96,96,.15);color:var(--red);border:1px solid rgba(255,96,96,.35);border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit"`
      :`style="width:100%;background:var(--green);color:#000;border:none;border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit"`;
    const joinBtnText=draw.requireTicket?'🎟 Участвовать (нужен билет)':'🎯 Участвовать';
    el.innerHTML=`${draw.imageUrl?`<img src="${draw.imageUrl}" style="width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:10px">`:`<div style="height:70px;border-radius:10px;background:linear-gradient(135deg,#1a2e1a,#0d1f14);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:10px">🎁</div>`}
    ${ticketBadge}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <div style="font-size:15px;font-weight:800;color:var(--green)">${draw.prize}${draw.isMoney?` <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`:''}</div>
      <div style="font-size:10px;color:var(--muted2);background:rgba(255,255,255,.05);padding:3px 8px;border-radius:8px">⏱ ${tl}</div>
    </div>
    <div style="font-size:11px;color:var(--muted2);margin-bottom:10px;display:flex;gap:10px">
      <span>👥 Участников: ${draw.participantsCount}</span>
      <span>👑 Победителей: ${wc}</span>
    </div>
    <button onclick="joinDraw(${draw.id},this,${draw.requireTicket?'true':'false'})" ${joinBtnStyle}>${joinBtnText}</button>`;
    cont.appendChild(el);
  });
  renderHomeDraws(active);
}

function renderFinishedDraws(draws){
  const cont=document.getElementById('raffles-finished');if(!cont)return;
  const empty=document.getElementById('raffles-fin-empty');
  cont.querySelectorAll('.fin-card').forEach(e=>e.remove());
  if(!draws.length){if(empty)empty.style.display='';return;}
  if(empty)empty.style.display='none';
  draws.forEach(draw=>{
    const el=document.createElement('div');
    el.className='gc fin-card';el.style.cssText='padding:14px;margin-bottom:10px';
    const date=new Date(draw.finishedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    const winners=draw.winners||[];
    const topWinner=winners[0];
    const extraWinners=winners.length>1?` +ещё ${winners.length-1}`:'';
    const ticketBadge=draw.requireTicket?`<span class="ticket-badge-sm">🎟 с билетом</span>`:'';
    el.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:10px;font-weight:700;color:var(--red);background:var(--rdim);padding:2px 8px;border-radius:6px">Завершён</div>
          ${ticketBadge}
        </div>
        <div style="font-size:10px;color:var(--muted2)">${date}</div>
      </div>
      ${draw.imageUrl?`<img src="${draw.imageUrl}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:10px">`:''}
      <div style="font-size:15px;font-weight:800;margin-bottom:8px">🏆 ${draw.prize}${draw.isMoney?' монет':''}</div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:2px">
        <span style="font-size:14px">👑</span>
        <span style="font-size:13px;font-weight:700;color:var(--green);flex:1">${topWinner?topWinner.name+'<span style="color:var(--muted2);font-weight:400">'+extraWinners+'</span>':'Победителей нет'}</span>
        ${draw.isMoney&&topWinner?`<span style="font-size:11px;font-weight:700;color:var(--green);background:var(--gdim);border:1px solid var(--gbor);border-radius:8px;padding:3px 8px">+${Math.floor(parseInt(draw.prize)/(draw.winnersCount||1))}<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg></span>`:''}
      </div>
      <button class="dp-show-btn" onclick="openDpMo(${JSON.stringify(draw).replace(/"/g,'&quot;')})">👥 Показать участников · ${(draw.participants||[]).length}</button>
    `;
    cont.appendChild(el);
  });
}

function renderHomeDraws(draws){
  const el=document.getElementById('h-raf-block');if(!el)return;
  if(!draws.length){el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;padding:20px;opacity:.4;gap:8px"><div style="width:40px;height:40px;color:var(--green)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg></div><div style="font-size:12px;color:var(--muted)">Пока розыгрышей нет</div></div>`;return;}
  el.innerHTML=draws.slice(0,2).map(d=>`<div onclick="go('raffles')" style="background:var(--glass);border:1px solid var(--gb);border-radius:12px;padding:10px 12px;cursor:pointer;margin-bottom:7px;display:flex;align-items:center;gap:10px">
    <div style="font-size:22px">${d.imageUrl?`<img src="${d.imageUrl}" style="width:34px;height:34px;border-radius:7px;object-fit:cover">`:'🎁'}</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:var(--green)">${d.prize}${d.isMoney?` <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`:''}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
        <span style="font-size:10px;color:var(--muted2)">${d.participantsCount} участников</span>
        ${d.requireTicket?`<span class="ticket-badge-sm">🎟 билет</span>`:''}
      </div>
    </div>
    <div style="font-size:14px;color:var(--muted)">›</div>
  </div>`).join('');
}

async function joinDraw(id,btn,requireTicket){
  btn.disabled=true;btn.textContent='Участвуем...';
  try{
    const body={drawId:id,userId:UID,username:TGU.username,firstName:TGU.first_name};
    if(requireTicket){
      const tickets=S.inventory['ticket']||0;
      if(tickets<1){
        btn.disabled=false;
        btn.textContent='🎟 Участвовать (нужен билет)';
        toast('❌ Нет билетов в инвентаре','r');
        return;
      }
      body.useTicket=true;
    }
    const r=await fetch('/api/draws/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    if(d.ok){
      if(requireTicket)removeInv('ticket',1);
      btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg> Вы участвуете';
      btn.style.background='var(--gdim)';btn.style.color='var(--green)';
      btn.style.border='1px solid var(--gbor)';
      toast('🎯 Вы в розыгрыше!','g');
    } else if(d.error==='ticket_required'){
      btn.disabled=false;btn.textContent='🎟 Участвовать (нужен билет)';
      toast('❌ Нет билетов в инвентаре','r');
    } else {
      btn.disabled=false;
      btn.textContent=requireTicket?'🎟 Участвовать (нужен билет)':'🎯 Участвовать';
      toast(d.error||'Ошибка','r');
    }
  }catch{
    btn.disabled=false;
    btn.textContent=requireTicket?'🎟 Участвовать (нужен билет)':'🎯 Участвовать';
    toast('Ошибка соединения','r');
  }
}

/* ══ DRAW PARTICIPANTS BOTTOM SHEET ══ */
let _dpDraw=null;
let _dpTab='winners';

function openDpMo(draw){
  _dpDraw=draw;
  _dpTab='winners';
  document.getElementById('dp-title').textContent='🎁 '+draw.prize+(draw.isMoney?' монет':'');
  const date=new Date(draw.finishedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  document.getElementById('dp-prize').textContent='Завершён: '+date;
  document.getElementById('dp-tab-w').classList.add('active');
  document.getElementById('dp-tab-p').classList.remove('active');
  _renderDpBody('winners');
  document.getElementById('dp-mo').classList.add('show');
  _initDpSwipe();
}

function closeDpMo(){
  const box=document.getElementById('dp-box');
  box.style.transition='transform .28s cubic-bezier(.4,0,.2,1)';
  box.style.transform='translateY(100%)';
  setTimeout(()=>{
    document.getElementById('dp-mo').classList.remove('show');
    box.style.transition='';
    box.style.transform='';
  },280);
}

function dpTab(tab,btn){
  _dpTab=tab;
  document.querySelectorAll('.dp-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  _renderDpBody(tab);
}

function _renderDpBody(tab){
  const body=document.getElementById('dp-body');
  if(!_dpDraw){body.innerHTML='';return;}
  if(tab==='winners'){
    const winners=_dpDraw.winners||[];
    const wc=_dpDraw.winnersCount||1;
    const prizeEach=_dpDraw.isMoney?Math.floor(parseInt(_dpDraw.prize)/wc):0;
    if(!winners.length){
      body.innerHTML=`<div class="dp-empty"><div class="dp-empty-ico">🏆</div><div class="dp-empty-t">Победителей нет</div></div>`;
      return;
    }
    body.innerHTML=winners.map((w,i)=>`
      <div class="dp-winner-row">
        <div class="dp-winner-num">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'👑'}</div>
        <div class="dp-winner-name">${w.name}</div>
        ${_dpDraw.isMoney?`<div class="dp-winner-prize">+${prizeEach}<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg></div>`:''}
      </div>`).join('');
  } else {
    const parts=_dpDraw.participants||[];
    const winnerNames=new Set((_dpDraw.winners||[]).map(w=>w.name));
    if(!parts.length){
      body.innerHTML=`<div class="dp-empty"><div class="dp-empty-ico">👥</div><div class="dp-empty-t">Участников нет</div></div>`;
      return;
    }
    body.innerHTML=parts.map((p,i)=>`
      <div class="dp-part-row">
        <div class="dp-part-num">${i+1}</div>
        <div class="dp-part-name">${p.name}</div>
        ${winnerNames.has(p.name)?'<div class="dp-part-badge">👑 Победитель</div>':''}
      </div>`).join('');
  }
}

function _initDpSwipe(){
  const box=document.getElementById('dp-box');
  const dragWrap=document.getElementById('dp-drag-wrap');
  let startY=0,curY=0,dragging=false;
  function onStart(e){startY=e.touches?e.touches[0].clientY:e.clientY;curY=0;dragging=true;box.style.transition='none';}
  function onMove(e){if(!dragging)return;const y=(e.touches?e.touches[0].clientY:e.clientY)-startY;if(y<0)return;curY=y;box.style.transform=`translateY(${y}px)`;const op=Math.max(0,0.82-y/400);document.getElementById('dp-mo').style.background=`rgba(0,0,0,${op})`;}
  function onEnd(){if(!dragging)return;dragging=false;if(curY>110){closeDpMo();document.getElementById('dp-mo').style.background='';}else{box.style.transition='transform .22s cubic-bezier(.4,0,.2,1)';box.style.transform='translateY(0)';document.getElementById('dp-mo').style.background='';}}
  const newDrag=dragWrap.cloneNode(true);
  dragWrap.parentNode.replaceChild(newDrag,dragWrap);
  newDrag.addEventListener('touchstart',onStart,{passive:true});
  newDrag.addEventListener('touchmove',onMove,{passive:true});
  newDrag.addEventListener('touchend',onEnd);
  newDrag.addEventListener('mousedown',onStart);
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onEnd);
}
