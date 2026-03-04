/* ══ INIT ══ */
async function init(){
  const name=TGU.first_name||'User';
  const uname=TGU.username?'@'+TGU.username:'Без username';
  function setAv(id){
    const el=document.getElementById(id);if(!el)return;
    if(TGU.photo_url){el.innerHTML=`<img src="${TGU.photo_url}" onerror="this.parentElement.textContent='${name[0].toUpperCase()}'">`;}
    else{el.textContent=name[0].toUpperCase();}
  }
  setAv('av-h');setAv('av-p');
  document.getElementById('h-name').textContent=name;
  document.getElementById('p-name').textContent=name;
  document.getElementById('p-un').textContent=uname;
  document.getElementById('p-reg').textContent=S.regDate;
  document.getElementById('p-refs').textContent=S.refs.length;
  document.getElementById('ref-link').textContent=`https://t.me/SATapp_bot?start=ref_${UID}`;
  applyNick(S.nickColor);
  applyCrown();
  applyLegend();
  updateVipUI();
  syncB();
  renderTasks();
  rShopItems();
  rCases();
  rRefStats();
  rRefList();
  document.getElementById('pi-h').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-h');});
  document.getElementById('pi-p').addEventListener('keydown',e=>{if(e.key==='Enter')usePromo('pi-p');});
  try{
    const sr=await fetch('/api/user/sync',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:UID,username:TGU.username||'',firstName:TGU.first_name||'',balance:S.balance,starsBalance:S.starsBalance})});
    const sd=await sr.json();
    if(sd.ok){
      S.balance=sd.balance;
      if(sd.starsBalance!==undefined)S.starsBalance=sd.starsBalance;
      syncB();
    }
  }catch{}
  loadDraws();
  setInterval(loadDraws,30000);
}

init();
