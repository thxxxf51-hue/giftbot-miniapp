/* ══ CASES ══ */
const _COIN_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const _STAR_OPEN_SVG=`<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

let _caseStats={};
(async()=>{try{const r=await fetch('/api/case/stats');const d=await r.json();if(d.ok)_caseStats=d.caseOpens||{};}catch(e){}})();

function rCases(){
  document.getElementById('shop-cases').innerHTML=CASES.map(c=>{
    let priceHtml='';
    let wrapClass='gc ccard';
    if(c.wip){
      priceHtml=`<div class="ccprice star-price">⭐ ${c.starsPrice} Stars</div>`;
      wrapClass='gc ccard ccard-wip';
    } else {
      priceHtml=`<div class="ccprice cc-open-price">${_STAR_OPEN_SVG} Открыть за ${c.price.toLocaleString('ru')} 🪙</div>`;
    }
    const photoHtml=c.photo?`<img src="${c.photo}" alt="${c.name}" loading="lazy" style="object-position:${c.photoPos||'center center'}">`:`<div class="ccimg-placeholder" style="background:${c.bg}"></div>`;
    const badge=(!c.wip&&c.drops.length)?`<div class="ccbadge">${c.drops.length} призов</div>`:'';
    return`<div class="${wrapClass}" ${c.wip?'':'onclick="openCaseMo('+c.id+')"'}>
      <div class="ccimg">${photoHtml}${badge}</div>
      <div class="ccinfo">
        <div class="ccname">${c.name}</div>
        ${priceHtml}
      </div>
    </div>`;
  }).join('');
}

/* ══ CASE ROULETTE ══ */
let curC=null,spinning=false,curSpinCount=1;
const IW=89;

function _fillCasePrizes(c){
  const grid=document.getElementById('cm-prizes-grid');
  if(grid)grid.innerHTML=c.drops.map(d=>`<div class="pvitem"><div class="pvico">${DROP_ICONS[d.icoKey]||''}</div><div class="pvname">${d.n}</div><div class="pvval">${d.v}</div></div>`).join('');
  const cnt=document.getElementById('cm-opened');
  if(cnt)cnt.textContent='Всего открыто: '+(_caseStats[c.id]||0).toLocaleString('ru');
}

function openCaseMo(id){
  curC=CASES.find(c=>c.id===id);if(!curC||curC.wip)return;
  spinning=false;
  curSpinCount=1;
  document.getElementById('cm-t').textContent=curC.name;
  document.getElementById('cm-spin').style.display='block';
  document.getElementById('cres').classList.remove('show');
  document.querySelectorAll('.spin-cnt-btn').forEach(b=>{
    b.classList.toggle('sel',parseInt(b.dataset.cnt)===1);
  });
  _fillCasePrizes(curC);
  buildReel('rtrack',curC.drops);
  buildReel('rtrack2',curC.drops);
  buildReel('rtrack3',curC.drops);
  updateReelLayout();
  updateCostDisplay();
  updateCmBtnState();
  document.getElementById('cmo').classList.add('show');
}

function setSpinCount(n){
  if(spinning)return;
  curSpinCount=n;
  document.querySelectorAll('.spin-cnt-btn').forEach(b=>{
    b.classList.toggle('sel',parseInt(b.dataset.cnt)===n);
  });
  updateReelLayout();
  updateCostDisplay();
  updateCmBtnState();
}

function updateReelLayout(){
  const multi=curSpinCount>1;
  const show3=curSpinCount>=3;
  document.getElementById('rw1').classList.toggle('compact',multi);
  document.getElementById('rw2').style.display=multi?'':'none';
  document.getElementById('rw2-sep').style.display=multi?'':'none';
  document.getElementById('rw3').style.display=show3?'':'none';
  document.getElementById('rw3-sep').style.display=show3?'':'none';
  if(curC){
    buildReel('rtrack',curC.drops);
    if(multi) buildReel('rtrack2',curC.drops);
    if(show3) buildReel('rtrack3',curC.drops);
  }
}

function updateCostDisplay(){
  const total=curC.price*curSpinCount;
  const el=document.getElementById('cm-cost');
  if(el)el.textContent=curSpinCount>1
    ?`Стоимость: ${total.toLocaleString('ru')} 🪙 (${curSpinCount} прокрута)`
    :`Стоимость: ${curC.price} 🪙`;
}

function updateCmBtnState(){
  const total=curC.price*curSpinCount;
  const btn=document.getElementById('cm-btn');
  btn.disabled=S.balance<total;
  const lack=total-S.balance;
  btn.textContent=S.balance<total?`Не хватает ${lack.toLocaleString('ru')} 🪙`:'🎰 Открыть';
}

function buildReel(trackId,drops){
  const track=document.getElementById(trackId);
  if(!track)return;
  let items=[];for(let i=0;i<10;i++)items.push(...drops);
  track.innerHTML=items.map((d,idx)=>`<div class="ritem" id="${trackId}-${idx}"><div class="rico">${DROP_ICONS[d.icoKey]||''}</div><div class="rname">${d.n}</div><div class="rval">${d.v}</div></div>`).join('');
  track.style.transition='none';track.style.transform='translateX(0)';
}

function spinReelRandom(trackId,drops,delayMs,duration,onDone){
  const track=document.getElementById(trackId);
  if(!track)return;
  const firstItem=track.querySelector('.ritem');
  const itemW=firstItem ? firstItem.offsetWidth+5 : IW;
  const total=drops.length*10;
  const winIdx=Math.floor(total/2)+Math.floor(Math.random()*drops.length);
  const winner=drops[winIdx%drops.length];
  const cw=track.parentElement.clientWidth;
  const tx=-(winIdx*itemW-cw/2+itemW/2);
  track.style.transition='none';
  track.style.transform='translateX(0)';
  setTimeout(()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      track.style.transition=`transform ${duration}ms cubic-bezier(0.1,0.82,0.05,1)`;
      track.style.transform=`translateX(${tx}px)`;
    }));
    setTimeout(()=>{
      document.querySelectorAll(`#${trackId} .ritem`).forEach(el=>el.classList.remove('win'));
      document.getElementById(`${trackId}-${winIdx}`)?.classList.add('win');
      setTimeout(()=>onDone(winner),300);
    },duration);
  },delayMs);
}

function spinReel(trackId,drops,onWin){
  const track=document.getElementById(trackId);
  const firstItem=track.querySelector('.ritem');
  const itemW=firstItem ? firstItem.offsetWidth+5 : IW;
  const total=drops.length*10;
  const winIdx=Math.floor(total/2)+Math.floor(Math.random()*drops.length);
  const cw=track.parentElement.clientWidth;
  const tx=-(winIdx*itemW-cw/2+itemW/2);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    track.style.transition='transform 5s cubic-bezier(0.1,0.82,0.05,1)';
    track.style.transform=`translateX(${tx}px)`;
  }));
  setTimeout(()=>{
    document.querySelectorAll(`#${trackId} .ritem`).forEach(el=>el.classList.remove('win'));
    document.getElementById(`${trackId}-${winIdx}`)?.classList.add('win');
    setTimeout(()=>onWin(drops[winIdx%drops.length]),600);
  },5000);
}

function spinCase(){
  if(spinning||!curC)return;
  const total=curC.price*curSpinCount;
  if(S.balance<total){toast('❌ Недостаточно монет!','r');return;}
  spinning=true;
  S.balance-=total;
  syncB();
  document.getElementById('cm-btn').disabled=true;
  document.querySelectorAll('.spin-cnt-btn').forEach(b=>b.disabled=true);

  if(curSpinCount===1){
    spinReel('rtrack',curC.drops,(winner)=>{
      spinning=false;
      let coins=winner.coins||0;
      if(coins>0&&S.bonusMulti>1){coins*=S.bonusMulti;S.bonusMulti=0;save();toast(`⚡ Бонус применён!`,'g');}
      if(coins>0){S.balance+=coins;syncB();}
      if(winner.vipDays)activateVip(winner.vipDays);
      if(winner.crownDays)activateCrownTimed(winner.crownDays);
      if(winner.legendDays)activateLegendTimed(winner.legendDays);
      if(winner.inv)addInv(winner.inv,winner.cnt||1);
      document.getElementById('cm-spin').style.display='none';
      const r=document.getElementById('cres');r.classList.add('show');
      document.getElementById('cr-ico').innerHTML=DROP_ICONS[winner.icoKey]||winner.n;
      document.getElementById('cr-t').textContent='Вы получили: '+winner.n;
      document.getElementById('cr-s').innerHTML=`<span>${coins>0?'+'+coins.toLocaleString('ru')+' монет':winner.v}</span>`;
      toast('🎉 '+winner.n+'!','g');
      if(!S.doneTasks.has(6))completeTask(6);
      fetch('/api/case/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseId:curC.id,count:1})}).then(r=>r.json()).then(d=>{if(d.ok){_caseStats[curC.id]=d.opens;const el=document.getElementById('cm-opened');if(el)el.textContent='Всего открыто: '+d.opens.toLocaleString('ru');}}).catch(()=>{});
      rShopItems();
    });
  } else {
    const REEL_IDS=['rtrack','rtrack2','rtrack3'];
    const DELAYS=[0,500,1000];
    const DURATION=4500;
    const VISUAL_COUNT=curSpinCount;
    const actualWinners=[];
    let doneCount=0;

    function onReelDone(winner){
      actualWinners.push(winner);
      doneCount++;
      if(doneCount<VISUAL_COUNT)return;
      spinning=false;
      let totalCoins=0;
      for(const w of actualWinners){
        let coins=w.coins||0;
        if(coins>0&&S.bonusMulti>1){coins*=S.bonusMulti;S.bonusMulti=0;save();}
        totalCoins+=coins;
        if(w.vipDays)activateVip(w.vipDays);
        if(w.crownDays)activateCrownTimed(w.crownDays);
        if(w.legendDays)activateLegendTimed(w.legendDays);
        if(w.inv)addInv(w.inv,w.cnt||1);
      }
      if(totalCoins>0){S.balance+=totalCoins;syncB();}
      const summary={};
      for(const w of actualWinners){
        const key=(w.icoKey||w.n)+'__'+w.n;
        if(!summary[key])summary[key]={...w,count:0,totalCoins:0};
        summary[key].count++;
        summary[key].totalCoins+=(w.coins||0);
      }
      const rows=Object.values(summary).map(s=>`
        <div class="multi-win-row">
          <span class="multi-win-ico">${DROP_ICONS[s.icoKey]||''}</span>
          <span class="multi-win-name">${s.n}</span>
          <span class="multi-win-val">×${s.count}${s.totalCoins>0?' · +'+s.totalCoins.toLocaleString('ru')+' 🪙':''}</span>
        </div>`).join('');
      document.getElementById('cm-spin').style.display='none';
      const r=document.getElementById('cres');r.classList.add('show');
      document.getElementById('cr-ico').textContent='🎰';
      document.getElementById('cr-t').textContent=`Открыто ×${curSpinCount}!`;
      let html=`<div class="multi-win-list">${rows}</div>`;
      if(totalCoins>0)html+=`<div class="multi-total">+${totalCoins.toLocaleString('ru')} монет итого</div>`;
      document.getElementById('cr-s').innerHTML=html;
      toast(`🎉 Открыто ×${curSpinCount}!`,'g');
      if(!S.doneTasks.has(6))completeTask(6);
      fetch('/api/case/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseId:curC.id,count:curSpinCount})}).then(r=>r.json()).then(d=>{if(d.ok){_caseStats[curC.id]=d.opens;const el=document.getElementById('cm-opened');if(el)el.textContent='Всего открыто: '+d.opens.toLocaleString('ru');}}).catch(()=>{});
      rShopItems();
    }

    for(let i=0;i<VISUAL_COUNT;i++){
      spinReelRandom(REEL_IDS[i],curC.drops,DELAYS[i],DURATION,onReelDone);
    }
  }
}

function closeCase(){
  document.getElementById('cmo').classList.remove('show');
  spinning=false;
  curSpinCount=1;
  document.querySelectorAll('.spin-cnt-btn').forEach(b=>b.disabled=false);
  rShopItems();rCases();
}

/* ══ MEGA GIFT ══ */
const MEGA_DROPS=[
  {icoKey:'vip',n:'VIP',v:'7 дней',vipDays:7},
  {icoKey:'ticket',n:'Билеты',v:'х10',inv:'ticket',cnt:10},
  {icoKey:'crown',n:'Корона',v:'14 дней',inv:'crown',cnt:1},
  {icoKey:'megagift',n:'Кейс Богача',v:'бесплатно',freeCase:3},
];
let megaSpinning=false;
function openMegaGift(){
  megaSpinning=false;
  document.getElementById('mega-spin').style.display='block';
  document.getElementById('mega-res').classList.remove('show');
  document.getElementById('mega-btn').disabled=false;
  buildReel('mega-rtrack',MEGA_DROPS);
  document.getElementById('megamo').classList.add('show');
}
function spinMega(){
  if(megaSpinning)return;
  megaSpinning=true;
  document.getElementById('mega-btn').disabled=true;
  spinReel('mega-rtrack',MEGA_DROPS,(winner)=>{
    megaSpinning=false;
    if(winner.vipDays)activateVip(winner.vipDays);
    if(winner.crownDays)activateCrownTimed(winner.crownDays);
    if(winner.legendDays)activateLegendTimed(winner.legendDays);
    if(winner.inv)addInv(winner.inv,winner.cnt||1);
    if(winner.freeCase){curC=CASES.find(c=>c.id===winner.freeCase);if(curC){S.balance+=curC.price;}}
    document.getElementById('mega-spin').style.display='none';
    const r=document.getElementById('mega-res');r.classList.add('show');
    document.getElementById('mr-ico').innerHTML=DROP_ICONS[winner.icoKey]||winner.n;
    document.getElementById('mr-t').textContent='Вы получили: '+winner.n;
    document.getElementById('mr-s').textContent=winner.v;
    toast('🎉 '+winner.n+'!','g');
    syncB();renderInv();
  });
}
