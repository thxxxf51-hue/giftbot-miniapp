/* ══════════════════════════════════════════════════════════
   BETS.JS — Ставки на спорт (прямые запросы к API-Football)
══════════════════════════════════════════════════════════ */

const BETS_API_KEY  = '4e80f3ce6a9525c8e3e738a498b63101';
const BETS_API_BASE = 'https://v3.football.api-sports.io';

const COIN_SVG_Y   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const COIN_SVG_G   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
const COIN_SVG_BLK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;

let _bTab   = 'live';
let _bCur   = 'coins';
let _bOdds  = 2.0;
let _bMatch = '';
let _bPick  = '';
let _bTimer = null;

/* ── запрос через сервер-прокси (Railway) ── */
async function _apiFetch(endpoint) {
  // map API endpoint to our server proxy route
  let route;
  if (endpoint.includes('live=all')) route = '/api/sports/live';
  else if (endpoint.includes('status=NS')) route = '/api/sports/today';
  else route = '/api/sports/live';
  const res = await fetch(route);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const d = await res.json();
  // server returns { fixtures: [...] }, convert to API format
  return { response: d.fixtures || [] };
}

/* ── иконки команд ── */
const _TC = ['#5b8def','#ff6060','#2ecc71','#ffd700','#a855f7','#ff7b45','#00bcd4','#e91e63','#ff9800'];
const _TS = ['shield','heart','shield','crown','shield','heart','circle','shield','crown'];
function _ts(i){ return { c:_TC[i%_TC.length], s:_TS[i%_TS.length] }; }
function _ico(c,s){
  if(s==='shield') return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  if(s==='heart')  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  if(s==='crown')  return `<svg viewBox="0 0 24 24" fill="${c}" stroke="${c}" stroke-width="1"><path d="M2 19h20l-3-10-4 5-3-8-3 8-4-5z"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>`;
}

/* ── коэффициенты ── */
function _calcOdds(fix){
  const gh=fix.goals?.home??0, ga=fix.goals?.away??0;
  const st=fix.fixture?.status?.short;
  const live=['1H','2H','HT','ET','BT','P','INT'].includes(st);
  let o1=2.0, ox=3.2, o2=3.5;
  if(live){
    if(gh>ga){o1=1.55;ox=3.8;o2=5.5;}
    else if(ga>gh){o1=5.2;ox=3.6;o2=1.55;}
    else{o1=2.2;ox=2.9;o2=2.8;}
  }
  const seed=((fix.fixture?.id||0)%100)/100;
  return{
    o1:Math.max(1.2,+(o1+seed*.4-.2).toFixed(2)),
    ox:Math.max(2.5,+(ox+seed*.3-.15).toFixed(2)),
    o2:Math.max(1.2,+(o2+seed*.5-.25).toFixed(2))
  };
}

/* ── карточка матча ── */
function _card(fix, hi){
  const H=fix.teams.home.name, A=fix.teams.away.name;
  const gh=fix.goals?.home, ga=fix.goals?.away;
  const st=fix.fixture?.status?.short;
  const el=fix.fixture?.status?.elapsed;
  const live=['1H','2H','HT','ET','BT','P','INT','LIVE'].includes(st);
  const pause=st==='HT';
  const {o1,ox,o2}=_calcOdds(fix);
  const hs=_ts(hi*2), as=_ts(hi*2+1);
  const Hesc=H.replace(/'/g,"\\'"), Aesc=A.replace(/'/g,"\\'");

  let statusHtml='';
  if(live&&!pause) statusHtml=`<div style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:#ff5050"><span class="bets-dot-live"></span>${el||'?'}'</div>`;
  else if(pause)   statusHtml=`<div style="font-size:10px;font-weight:800;color:#f4c430">⏸ HT</div>`;
  else if(st==='NS'){
    const t=fix.fixture?.date?new Date(fix.fixture.date).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}):'—';
    statusHtml=`<div style="font-size:12px;font-weight:800;color:rgba(255,255,255,.4)">${t}</div>`;
  } else statusHtml=`<div style="font-size:10px;color:var(--muted2);font-weight:600">${st||''}</div>`;

  const showScore=live||['FT','AET','PEN'].includes(st);
  const sH=showScore&&gh!=null?`<div style="font-size:18px;font-weight:900;color:${gh>ga?'#fff':'rgba(255,255,255,.35)'}">${gh}</div>`:'';
  const sA=showScore&&ga!=null?`<div style="font-size:18px;font-weight:900;color:${ga>gh?'#fff':'rgba(255,255,255,.35)'}">${ga}</div>`:'';

  return `<div class="bmc" onclick="betsOpenSlip(this,'${Hesc} vs ${Aesc}',${o1},${ox},${o2},'${Hesc}','${Aesc}')">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">${statusHtml}<div style="font-size:9px;color:rgba(255,255,255,.18);font-weight:600">${live&&!pause?'идёт':pause?'перерыв':''}</div></div>
  <div style="display:flex;flex-direction:column;gap:5px">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="bteam-logo">${_ico(hs.c,hs.s)}</div>
      <div class="bteam-name" style="font-size:13px;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H}</div>${sH}
    </div>
    <div style="height:1px;background:rgba(255,255,255,.04)"></div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="bteam-logo">${_ico(as.c,as.s)}</div>
      <div class="bteam-name" style="font-size:13px;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${A}</div>${sA}
    </div>
  </div>
  <div class="bodds-row">
    <div class="bodd" data-odds="${o1}" data-label="П1 (${Hesc})" onclick="event.stopPropagation();betsPickOdd(this)"><span class="bodd-lbl">П1</span><span class="bodd-val">${o1}</span></div>
    <div class="bodd" data-odds="${ox}" data-label="Ничья" onclick="event.stopPropagation();betsPickOdd(this)"><span class="bodd-lbl">Х</span><span class="bodd-val">${ox}</span></div>
    <div class="bodd" data-odds="${o2}" data-label="П2 (${Aesc})" onclick="event.stopPropagation();betsPickOdd(this)"><span class="bodd-lbl">П2</span><span class="bodd-val">${o2}</span></div>
  </div>
</div>`;
}

/* ── группа лиги ── */
function _league(lid, name, matches, idx){
  const liveBadge=_bTab==='live'?`<div class="bets-live-badge"><span class="bets-dot-live" style="width:5px;height:5px"></span>LIVE</div>`:'';
  return `<div class="bleague-hdr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20"/></svg><span class="bleague-name">${name}</span>${liveBadge}</div>`
    + matches.map((f,i)=>_card(f,idx+i)).join('');
}

function _groupAndRender(fixtures){
  if(!fixtures.length) return null;
  const lg={};
  fixtures.forEach(f=>{ const id=f.league.id; if(!lg[id]) lg[id]={name:f.league.name,m:[]}; lg[id].m.push(f); });
  let html='', idx=0;
  Object.entries(lg).forEach(([id,g])=>{ html+=_league(+id,g.name,g.m,idx); idx+=g.m.length; });
  return html;
}

/* ── загрузка live матчей ── */
async function betsLoadLive(){
  const el=document.getElementById('bets-live-cont'); if(!el) return;
  el.innerHTML=`<div class="bets-loading">⚽ Загружаем матчи...</div>`;
  try{
    const d=await _apiFetch('/fixtures?live=all&timezone=Europe/Moscow');
    const fixtures=d.response||[];
    const liveEl=document.getElementById('bets-live-count');
    if(liveEl) liveEl.textContent=fixtures.length?fixtures.length+' матчей live':'live матчи';
    const html=_groupAndRender(fixtures);
    if(!html){
      // No live matches — auto switch to Today tab
      el.innerHTML=`<div class="bets-empty">⚽<br><span style="font-size:14px;font-weight:700">Нет live матчей</span><br><span style="font-size:11px;opacity:.6">Переключаем на предстоящие...</span></div>`;
      setTimeout(()=>{
        const todayBtn = document.querySelector('.bets-tab:nth-child(2)');
        if(todayBtn) betsSwitchTab('today', todayBtn);
      }, 800);
      return;
    }
    el.innerHTML=html;
  } catch(e){
    console.error('bets live:', e);
    el.innerHTML=`<div class="bets-empty">📡<br>Ошибка загрузки<br><span style="font-size:11px;opacity:.6">${e.message||''}</span></div>`;
  }
}

/* ── загрузка матчей на сегодня ── */
async function betsLoadToday(){
  const el=document.getElementById('bets-today-cont'); if(!el) return;
  el.innerHTML=`<div class="bets-loading">⚽ Загружаем матчи...</div>`;
  try{
    const today=new Date().toISOString().slice(0,10);
    const d=await _apiFetch(`/fixtures?date=${today}&status=NS&timezone=Europe/Moscow`);
    const fixtures=(d.response||[]).slice(0,60);
    const html=_groupAndRender(fixtures);
    if(!html){ el.innerHTML=`<div class="bets-empty">📅<br><span style="font-size:14px;font-weight:700">Нет предстоящих матчей</span></div>`; return; }
    el.innerHTML=html;
  } catch(e){
    el.innerHTML=`<div class="bets-empty">📡<br>Ошибка загрузки</div>`;
  }
}

/* ── история ставок ── */
async function betsLoadHistory(){
  const el=document.getElementById('bets-hist-cont'); if(!el) return;
  el.innerHTML=`<div class="bets-loading">Загружаем...</div>`;
  try{
    const uid=window.S?.uid||window.tgUserId||'';
    const d=await fetch('/api/bets/history?uid='+uid).then(r=>r.json());
    const bets=d.bets||[];
    if(!bets.length){ el.innerHTML=`<div class="bets-empty">${COIN_SVG_Y}<br><span style="font-size:14px;font-weight:700">Ставок пока нет</span><br><span style="font-size:11px;opacity:.6">Сделай первую ставку!</span></div>`; return; }
    const active=bets.filter(b=>b.status==='pending');
    const done=bets.filter(b=>b.status!=='pending');
    let html='';
    if(active.length){ html+=`<div class="bhist-sec">Активные</div>`; active.forEach(b=>{html+=_histItem(b);}); }
    if(done.length)  { html+=`<div class="bhist-sec">Завершённые</div>`; done.forEach(b=>{html+=_histItem(b);}); }
    el.innerHTML=html;
  } catch(e){ el.innerHTML=`<div class="bets-empty">Ошибка загрузки</div>`; }
}

function _histItem(b){
  const iw=b.status==='win',il=b.status==='lose',ip=b.status==='pending';
  const dc=iw?'#2ecc71':il?'#ff6060':'#f4c430';
  const rt=iw?`+ ${b.winAmount?.toLocaleString('ru')}`:il?`− ${b.amount?.toLocaleString('ru')}`:`→ ${Math.round((b.amount||0)*(b.odds||1))?.toLocaleString('ru')}`;
  const dotStyle=ip?`background:${dc};box-shadow:0 0 6px ${dc};animation:bpulse 2s infinite`:`background:${dc};box-shadow:0 0 5px ${dc}`;
  const unitSvg=b.currency==='stars'?'⭐':`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2.2" stroke-linecap="round"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
  return `<div class="bhist-item"><div class="bhist-dot" style="${dotStyle}"></div><div class="bhist-info"><div class="bhist-match">${b.matchName}</div><div class="bhist-pick">${b.pick} · × ${(b.odds||0).toFixed(2)}</div></div><div class="bhist-right"><div class="bhist-stake">${(b.amount||0).toLocaleString('ru')} ${unitSvg}</div><div class="bhist-res" style="color:${dc}">${rt}</div></div></div>`;
}

/* ── переключение вкладок ── */
function betsSwitchTab(name, el){
  _bTab=name;
  document.querySelectorAll('.bets-tab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  ['live','today','history'].forEach(t=>{
    const c=document.getElementById('bets-tab-'+t);
    if(c) c.style.display=(t===name)?'':'none';
  });
  if(name==='live')    betsLoadLive();
  if(name==='today')   betsLoadToday();
  if(name==='history') betsLoadHistory();
}

/* ── вход/выход со страницы ── */
function onBetsPageEnter(){
  clearInterval(_bTimer);
  _bTab='live';
  document.querySelectorAll('.bets-tab').forEach((b,i)=>b.classList.toggle('active',i===0));
  const tl=document.getElementById('bets-tab-live');
  const tt=document.getElementById('bets-tab-today');
  const th=document.getElementById('bets-tab-history');
  if(tl) tl.style.display='';
  if(tt) tt.style.display='none';
  if(th) th.style.display='none';
  betsLoadLive();
  _bTimer=setInterval(()=>{ if(_bTab==='live') betsLoadLive(); },30000);
}
function onBetsPageLeave(){ clearInterval(_bTimer); }

/* ── открыть купон ── */
function betsOpenSlip(card, matchName, o1, ox, o2, home, away){
  _bMatch=matchName; _bOdds=o1; _bPick='П1 ('+home+')'; _bCur='coins';
  document.getElementById('bs-match').textContent=matchName;
  document.getElementById('bs-pick').textContent='П1 ('+home+')';
  document.getElementById('bs-odds-badge').textContent='× '+o1.toFixed(2);
  const btns=document.querySelectorAll('.bsodd');
  const data=[{o:o1,l:'П1 ('+home+')'},{o:ox,l:'Ничья'},{o:o2,l:'П2 ('+away+')'}];
  btns.forEach((b,i)=>{ b.dataset.odds=data[i].o; b.dataset.label=data[i].l; b.querySelector('.bsodd-v').textContent=data[i].o.toFixed(2); b.classList.toggle('bsodd-sel',i===0); });
  document.querySelectorAll('.bsct').forEach(b=>b.classList.remove('active'));
  document.getElementById('bsct-coins').classList.add('active');
  document.getElementById('bs-mincur').textContent='мин. 1 000';
  document.getElementById('bs-amount').value='5000';
  betsCalcPot();
  document.getElementById('bets-slip-mo').classList.add('show');
  try{ window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }catch(e){}
}

function betsPickOdd(btn){
  btn.closest('.bmc').querySelectorAll('.bodd').forEach(b=>b.classList.remove('bodd-sel'));
  btn.classList.add('bodd-sel');
  const card=btn.closest('.bmc');
  const names=card.querySelectorAll('.bteam-name');
  const H=names[0]?.textContent||'', A=names[1]?.textContent||'';
  const odds=card.querySelectorAll('.bodd');
  const o1=parseFloat(odds[0]?.dataset.odds||2);
  const ox=parseFloat(odds[1]?.dataset.odds||3);
  const o2=parseFloat(odds[2]?.dataset.odds||3.5);
  betsOpenSlip(card,H+' vs '+A,o1,ox,o2,H,A);
  const idx=[...card.querySelectorAll('.bodd')].indexOf(btn);
  document.querySelectorAll('.bsodd').forEach((b,i)=>b.classList.toggle('bsodd-sel',i===idx));
  if(idx>=0){
    const sb=document.querySelectorAll('.bsodd')[idx];
    if(sb){ _bOdds=parseFloat(sb.dataset.odds); _bPick=sb.dataset.label; document.getElementById('bs-pick').textContent=_bPick; document.getElementById('bs-odds-badge').textContent='× '+_bOdds.toFixed(2); }
  }
  betsCalcPot();
}

function betsSlipPick(btn){
  document.querySelectorAll('.bsodd').forEach(b=>b.classList.remove('bsodd-sel'));
  btn.classList.add('bsodd-sel');
  _bOdds=parseFloat(btn.dataset.odds);
  _bPick=btn.dataset.label;
  document.getElementById('bs-pick').textContent=_bPick;
  document.getElementById('bs-odds-badge').textContent='× '+_bOdds.toFixed(2);
  betsCalcPot();
}

function betsSetCur(cur, btn){
  _bCur=cur;
  document.querySelectorAll('.bsct').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(cur==='stars'){ document.getElementById('bs-mincur').textContent='мин. 50 ⭐'; document.getElementById('bs-amount').value='50'; }
  else{ document.getElementById('bs-mincur').textContent='мин. 1 000'; document.getElementById('bs-amount').value='5000'; }
  betsCalcPot();
}

function betsSetAmt(v){ document.getElementById('bs-amount').value=v; betsCalcPot(); }

function betsCalcPot(){
  const amt=parseInt(document.getElementById('bs-amount').value)||0;
  const profit=Math.round(amt*_bOdds)-amt;
  const cSvg=_bCur==='coins'?COIN_SVG_G:'';
  const unit=_bCur==='stars'?'⭐':'';
  document.getElementById('bs-pot').innerHTML=`+ ${profit.toLocaleString('ru')} ${unit}${cSvg}`;
  const btnUnit=_bCur==='stars'?'⭐':'монет';
  document.getElementById('bs-submit').innerHTML=`${COIN_SVG_BLK}<span>Поставить ${amt.toLocaleString('ru')} ${btnUnit}</span>`;
}

function betsCloseSlip(){ document.getElementById('bets-slip-mo').classList.remove('show'); }

/* ── отправка ставки ── */
async function betsSubmit(){
  const amt=parseInt(document.getElementById('bs-amount').value)||0;
  const min=_bCur==='stars'?50:1000;
  if(amt<min){ toast(`Мин. ставка: ${min} ${_bCur==='stars'?'⭐':'🪙'}`,'r'); return; }
  const uid=window.S?.uid||window.tgUserId||'';
  const btn=document.getElementById('bs-submit');
  btn.disabled=true; btn.style.opacity='.6';
  try{
    const d=await fetch('/api/bets/place',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,matchName:_bMatch,pick:_bPick,odds:_bOdds,amount:amt,currency:_bCur})}).then(r=>r.json());
    if(d.ok){ betsCloseSlip(); if(typeof syncB==='function') syncB(); toast('Ставка принята!','g'); }
    else toast(d.error||'Ошибка ставки','r');
  } catch(e){ toast('Ошибка сети','r'); }
  finally{ btn.disabled=false; btn.style.opacity=''; betsCalcPot(); }
}
