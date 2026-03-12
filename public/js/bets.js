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
let _bFixId = 0;
let _bPick  = '';
let _bTimer = null;

/* ── запрос через сервер-прокси (Railway) ── */
async function _apiFetch(endpoint) {
  // map API endpoint to our server proxy route
  // Pass endpoint params to server so it can forward correctly
  let route;
  if (endpoint.includes('live=all')) {
    route = '/api/sports/live';
  } else if (endpoint.includes('status=NS')) {
    // Extract date from endpoint and pass to server
    const dateMatch = endpoint.match(/date=([\d-]+)/);
    const date = dateMatch ? dateMatch[1] : '';
    route = '/api/sports/today?date='+date;
  } else {
    route = '/api/sports/live';
  }
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

  const fixId=fix.fixture?.id||0;
  return `<div class="bmc" data-fixid="${fixId}" onclick="betsOpenSlip(this,'${Hesc} vs ${Aesc}',${o1},${ox},${o2},'${Hesc}','${Aesc}',${fixId})">
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
  el.innerHTML=`<div class="bets-loading"><span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> Загружаем матчи...</span></div>`;
  try{
    const d=await _apiFetch('/fixtures?live=all&timezone=Europe/Moscow');
    const fixtures=d.response||[];
    const liveEl=document.getElementById('bets-live-count');
    if(liveEl) liveEl.textContent=fixtures.length?fixtures.length+' матчей live':'live матчи';
    const html=_groupAndRender(fixtures);
    if(!html){
      // No live matches — auto switch to Today tab
      el.innerHTML='<div class="bets-empty"><div style="margin-bottom:8px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 032 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 032-10z"/><path d="M2 12h20"/></svg></div><span style="font-size:14px;font-weight:700">Нет live матчей</span>'<br><span style="font-size:11px;opacity:.6">Переключаем на предстоящие...</span></div>`;
      const todayBtn=document.querySelector('.bets-tab:nth-child(2)');
      if(todayBtn) setTimeout(()=>betsSwitchTab('today',todayBtn),600);
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
  el.innerHTML=`<div class="bets-loading"><span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> Загружаем матчи...</span></div>`;
  try{
    // Fetch today + tomorrow to always show something
    const today=new Date().toISOString().slice(0,10);
    const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
    // Get today NS + tomorrow NS
    const [d1,d2]=await Promise.all([
      _apiFetch('/fixtures?date='+today+'&status=NS&timezone=Europe/Moscow'),
      _apiFetch('/fixtures?date='+tomorrow+'&status=NS&timezone=Europe/Moscow')
    ]);
    const fixtures=[...(d1.response||[]),...(d2.response||[])].slice(0,80);
    const html=_groupAndRender(fixtures);
    if(!html){
      el.innerHTML=`<div class="bets-empty">📅<br><span style="font-size:14px;font-weight:700">Нет предстоящих матчей</span><br><span style="font-size:11px;opacity:.6">Попробуй позже</span></div>`;
      return;
    }
    el.innerHTML=html;
  } catch(e){
    console.error('bets today:',e);
    el.innerHTML=`<div class="bets-empty">📡<br>Ошибка загрузки<br><span style="font-size:11px;opacity:.5">${e.message||''}</span></div>`;
  }
}

/* ── история ставок ── */
async function betsLoadHistory(){
  const el=document.getElementById('bets-hist-cont'); if(!el) return;
  el.innerHTML='<div class="bets-loading">Загружаем...</div>';
  const uid=(typeof UID!=='undefined'?UID:'')||window.tgUserId||'';
  fetch('/api/bets/history?uid='+uid).then(r=>r.json()).then(d=>{
    const list=d.bets||[];
    // Sync updated balance from server
    if(d.balance!==undefined && window.S){ window.S.balance=d.balance; if(typeof syncB==='function')syncB(); }
    if(d.starsBalance!==undefined && window.S){ window.S.starsBalance=d.starsBalance; if(typeof syncB==='function')syncB(); }

    if(!list.length){
      el.innerHTML='<div class="bets-empty">'+COIN_SVG_Y+'<br><span style="font-size:14px;font-weight:700;color:#fff">Ставок пока нет</span><br><span style="font-size:11px;color:rgba(255,255,255,.4)">Сделай первую ставку!</span></div>';
      return;
    }
    const active=list.filter(b=>b.status==='pending');
    const done  =list.filter(b=>b.status!=='pending');
    let html='';

    if(active.length){
      html+='<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 8px 2px"><span style="display:inline-flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="#f4c430" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Актуальные матчи</span></div>';
      active.forEach(b=>{ html+=_histCard(b); });
    }

    if(done.length){
      if(active.length) html+='<div style="height:12px"></div>';
      html+='<div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 8px 2px"><span style="display:inline-flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#bedd30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Завершённые</span></div>';
      done.forEach(b=>{ html+=_histCard(b); });
    }

    el.innerHTML=html;
  }).catch(()=>{
    el.innerHTML='<div class="bets-empty">Ошибка загрузки</div>';
  });
}

function _histCard(b){
  const iw=b.status==='win', il=b.status==='lose', ip=b.status==='pending';
  const cur=b.currency==='stars'?'⭐':'';
  const curLabel=b.currency==='stars'?'звёзд':'монет';

  // Status badge
  let badge='', glow='';
  if(ip){
    badge='<span style="background:rgba(244,196,48,.12);border:1px solid rgba(244,196,48,.3);color:#f4c430;font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px;display:inline-flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> В игре</span>';
  } else if(iw){
    badge='<span style="background:rgba(46,204,113,.12);border:1px solid rgba(46,204,113,.3);color:#2ecc71;font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px;display:inline-flex;align-items:center;gap:4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 01-2-2V5h4"/><path d="M18 9h2a2 2 0 002-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 9a6 6 0 0012 0V3H6v6z"/></svg> Выигрыш</span>';
    glow='box-shadow:0 0 0 1px rgba(46,204,113,.2);';
  } else {
    badge='<span style="background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.25);color:#ff6060;font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px;display:inline-flex;align-items:center;gap:4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff6060" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Проигрыш</span>';
  }

  // Score line
  const scoreLine=b.score?'<span style="font-size:11px;color:rgba(255,255,255,.35);margin-left:6px">'+b.score+'</span>':'';

  // Amount line
  let amtLine='';
  if(iw){
    const win=b.winAmount||Math.round(b.amount*b.odds);
    amtLine='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">'
      +'<span style="font-size:11px;color:rgba(255,255,255,.4)">Ставка: '+b.amount.toLocaleString('ru')+' '+cur+' '</span>'
      +'<span style="font-size:14px;font-weight:900;color:#2ecc71">+ '+win.toLocaleString('ru')+' '+cur+' '</span>'
      +'</div>';
  } else if(il){
    amtLine='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">'
      +'<span style="font-size:11px;color:rgba(255,255,255,.4)">Ставка</span>'
      +'<span style="font-size:14px;font-weight:900;color:#ff6060">− '+b.amount.toLocaleString('ru')+' '+cur+' '</span>'
      +'</div>';
  } else {
    const pot=Math.round(b.amount*(b.odds||1));
    amtLine='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">'
      +'<span style="font-size:11px;color:rgba(255,255,255,.4)">Ставка: '+b.amount.toLocaleString('ru')+' '+cur+' '</span>'
      +'<span style="font-size:13px;font-weight:800;color:#f4c430">→ '+pot.toLocaleString('ru')+' '+cur+' '</span>'
      +'</div>';
  }

  return '<div style="background:#131208;border:1px solid rgba(255,255,255,.07);'+glow+'border-radius:14px;padding:12px 14px;margin-bottom:8px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    +'<div style="font-size:12px;font-weight:800;color:#fff;flex:1;margin-right:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+b.matchName+scoreLine+'</div>'
    +badge
    +'</div>'
    +'<div style="font-size:11px;color:rgba(255,255,255,.5)">'+b.pick+' <span style="color:rgba(255,255,255,.25)">·</span> <span style="color:#bedd30">×'+( b.odds||0).toFixed(2)+'</span></div>'
    +amtLine
    +'</div>';
}


function betsOpenSlip(card, matchName, o1, ox, o2, home, away, fixId){
  _bMatch=matchName; _bFixId=fixId||0; _bOdds=o1; _bPick='П1 ('+home+')'; _bCur='coins';
  // Set match name
  const elMatch = document.getElementById('bs-match');
  const elPick  = document.getElementById('bs-pick');
  const elBadge = document.getElementById('bs-odds-badge');
  if(elMatch) elMatch.textContent = matchName;
  if(elPick)  elPick.textContent  = 'П1 ('+home+')';
  if(elBadge) elBadge.textContent = '× '+o1.toFixed(2);
  // Update odds buttons in slip modal
  const data=[{o:o1,l:'П1 ('+home+')'},{o:ox,l:'Ничья'},{o:o2,l:'П2 ('+away+')'}];
  const slip = document.getElementById('bets-slip-mo');
  const btns = slip ? slip.querySelectorAll('.bsodd') : [];
  btns.forEach(function(b,i){
    b.dataset.odds  = data[i].o;
    b.dataset.label = data[i].l;
    const vEl = b.querySelector('.bsodd-v');
    if(vEl) vEl.textContent = data[i].o.toFixed(2);
    const lEl = b.querySelector('.bsodd-lbl');
    if(lEl) lEl.textContent = i===0?'П1':i===1?'Х':'П2';
    b.classList.toggle('bsodd-sel', i===0);
  });
  // Reset currency
  document.querySelectorAll('.bsct').forEach(function(b){ b.classList.remove('active'); });
  const coinsBtn = document.getElementById('bsct-coins');
  if(coinsBtn) coinsBtn.classList.add('active');
  const minEl = document.getElementById('bs-mincur');
  const coinBal = (window.S?.balance||0).toLocaleString('ru');
  if(minEl) minEl.textContent = 'Баланс: '+coinBal+' монет  |  мин. 1 000';
  const amtEl = document.getElementById('bs-amount');
  if(amtEl) amtEl.value = '5000';
  betsCalcPot();
  // Show modal as flex
  if(slip){ slip.style.display='flex'; slip.classList.add('show'); }
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
  const fId=parseInt(card.dataset.fixid||0);
  betsOpenSlip(card,H+' vs '+A,o1,ox,o2,H,A,fId);
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
  const minEl=document.getElementById('bs-mincur');
  const amtEl=document.getElementById('bs-amount');
  if(cur==='stars'){
    const starBal=window.S?.starsBalance||0;
    if(minEl) minEl.textContent='Баланс: '+starBal+' ⭐  |  мин. 50';
    if(amtEl) amtEl.value='50';
  } else {
    const coinBal=(window.S?.balance||0).toLocaleString('ru');
    if(minEl) minEl.textContent='Баланс: '+coinBal+' монет  |  мин. 1 000';
    if(amtEl) amtEl.value='5000';
  }
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

function betsCloseSlip(){
  const slip = document.getElementById('bets-slip-mo');
  if(slip){ slip.classList.remove('show'); slip.style.display='none'; }
}

/* ── отправка ставки ── */
async function betsSubmit(){
  const amt=parseInt(document.getElementById('bs-amount').value)||0;
  const min=_bCur==='stars'?50:1000;
  if(amt<min){ toast('Мин. ставка: '+min+' '+(_bCur==='stars'?'⭐':'монет'),'r'); return; }
  // Check stars balance before sending
  if(_bCur==='stars'){
    const starBal=window.S?.starsBalance||0;
    if(starBal<amt){
      betsCloseSlip();
      // Open stars deposit - try standard ways
      if(typeof openStarsMo==='function') openStarsMo();
      else if(typeof go==='function') go('shop');
      toast('Недостаточно звёзд — пополни баланс','r');
      return;
    }
  }
  const uid=(typeof UID!=='undefined'?UID:'') || window.tgUserId || '';
  const btn=document.getElementById('bs-submit');
  btn.disabled=true; btn.style.opacity='.6';
  try{
    const d=await fetch('/api/bets/place',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,matchId:_bFixId,matchName:_bMatch,pick:_bPick,odds:_bOdds,amount:amt,currency:_bCur})}).then(r=>r.json());
    if(d.ok){
      betsCloseSlip();
      // Deduct locally so UI updates immediately
      if(_bCur==='stars' && window.S) window.S.starsBalance=Math.max(0,(window.S.starsBalance||0)-amt);
      else if(window.S) window.S.balance=Math.max(0,(window.S.balance||0)-amt);
      if(typeof syncB==='function') syncB();
      if(typeof updateB==='function') updateB();
      toast('<span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Ставка принята!</span>','g');
    }
    else toast(d.error||'Ошибка ставки','r');
  } catch(e){ toast('Ошибка сети','r'); }
  finally{ btn.disabled=false; btn.style.opacity=''; betsCalcPot(); }
}


/* ── lifecycle ── */
function onBetsPageEnter(){
  // Reset to Live tab
  betsSwitchTab('live', document.querySelector('.bets-tab'));
  // Start auto-refresh
  if(_bTimer) clearInterval(_bTimer);
  _bTimer = setInterval(function(){
    const activeTab = document.querySelector('.bets-tab.active');
    const tab = activeTab ? activeTab.textContent.trim().toLowerCase() : 'live';
    if(tab.includes('live')) betsLoadLive();
  }, 30000);
}

function onBetsPageLeave(){
  if(_bTimer){ clearInterval(_bTimer); _bTimer=null; }
}

function betsSwitchTab(tab, btn){
  // Update tab buttons
  document.querySelectorAll('.bets-tab').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  else {
    // find by text
    document.querySelectorAll('.bets-tab').forEach(function(b){
      if((tab==='live'&&b.textContent.includes('Live'))||
         (tab==='today'&&b.textContent.includes('Сегодня'))||
         (tab==='history'&&b.textContent.includes('ставки')))
        b.classList.add('active');
    });
  }
  // Show/hide tab panes
  var panes = {live:'bets-tab-live', today:'bets-tab-today', history:'bets-tab-history'};
  Object.keys(panes).forEach(function(k){
    var el = document.getElementById(panes[k]);
    if(el) el.style.display = k===tab ? 'block' : 'none';
  });
  // Load content
  if(tab==='live')    betsLoadLive();
  if(tab==='today')   betsLoadToday();
  if(tab==='history') betsLoadHistory();
}
