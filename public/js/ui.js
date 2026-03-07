/* ══ NAVIGATION ══ */
const PAGES=['home','tasks','shop','inventory','raffles','friends','profile','pvp'];
let curPage='home',navLk=false;

function go(name){
  if(name===curPage||navLk)return;
  navLk=true;
  // Page leave hooks
  if(curPage==='pvp') onPvpPageLeave?.();

  const old=document.getElementById('page-'+curPage);
  const nw=document.getElementById('page-'+name);
  old.classList.add('exit');
  old.addEventListener('animationend',()=>{old.classList.remove('active','exit');old.style.display='none';},{once:true});
  setTimeout(()=>{
    nw.style.display='block';
    nw.classList.add('active');
    nw.addEventListener('animationend',()=>{navLk=false;},{once:true});
  },60);
  PAGES.forEach(p=>document.getElementById('nb-'+p)?.classList.remove('active'));
  document.getElementById('nb-'+name)?.classList.add('active');
  // slide nav pill
  if(typeof _navPillUpdate==='function') _navPillUpdate(name);
  curPage=name;syncB();

  // Page enter hooks
  if(name==='inventory')renderInv();
  if(name==='pvp')onPvpPageEnter?.();
  if(name==='profile')loadTxList();
}

/* ══ TOAST ══ */
let _tt;
function toast(msg,type='g',icon=''){
  const el=document.getElementById('toast');
  if(icon){
    el.innerHTML='';
    const wrap=document.createElement('span');
    wrap.className='toast-ico';
    wrap.innerHTML=icon;
    const txt=document.createElement('span');
    txt.textContent=msg;
    el.appendChild(wrap);
    el.appendChild(txt);
  } else {
    el.textContent=msg;
  }
  el.className='toast '+type+' show';
  clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),2500);
}

const PROMO_ICO='<img src="/icons/check-circle.svg" width="18" height="18" style="display:block;flex-shrink:0">';
const PROMO_ERR_ICO='<img src="/icons/x-circle.svg" width="18" height="18" style="display:block;flex-shrink:0">';

/* ══ GENERAL MODAL ══ */
let _gmCb=null;
function openGenMo(title,sub,label,cb){
  document.getElementById('gm-t').textContent=title;
  document.getElementById('gm-s').textContent=sub;
  document.getElementById('gm-extra').innerHTML='';
  const a=document.getElementById('gm-a');a.textContent=label;a.className='mbtn g';
  document.querySelector('#genmo .mbtn.gray').onclick=closeGenMo;
  _gmCb=cb;
  document.getElementById('genmo').classList.add('show');
}
function closeGenMo(){document.getElementById('genmo').classList.remove('show');_gmCb=null;const a=document.getElementById('gm-a');if(a)a.style.display='';const ex=document.getElementById('gm-extra');if(ex)ex.innerHTML='';}
function doGenMo(){if(_gmCb)_gmCb();}

/* ══ TOP WINS MODAL ══ */
const MEDALS = ['🥇','🥈','🥉'];
const GAME_NAMES = { solo: 'Соло', duel: 'Дуэль', mines: 'Мины' };

function openTopWins(){
  const mo = document.getElementById('top-wins-mo');
  const box = document.getElementById('top-wins-box');
  const list = document.getElementById('top-wins-list');

  // Loading state
  list.innerHTML = `<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.3);font-size:13px">Загрузка...</div>`;

  // Animate in
  mo.style.pointerEvents = 'all';
  mo.style.background = 'rgba(0,0,0,0.7)';
  mo.style.backdropFilter = 'blur(8px)';
  box.style.transform = 'scale(1) translateY(0)';
  box.style.opacity = '1';

  // Haptic
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch{}

  // Fetch top wins
  fetch('/api/wins/top').then(r=>r.json()).then(d=>{
    if(!d.ok || !d.wins || d.wins.length === 0){
      list.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:28px 0;gap:10px">
          <div style="font-size:36px;opacity:.4">🏆</div>
          <div style="font-size:13px;color:rgba(255,255,255,.3);text-align:center;line-height:1.5">Пока нет выигрышей<br>больше 30 000 🪙 за сегодня</div>
        </div>`;
      return;
    }
    list.innerHTML = d.wins.map((w,i) => {
      const medal = MEDALS[i] || '';
      const gameName = GAME_NAMES[w.game] || w.game;
      const avatarContent = w.photoUrl
        ? `<img src="${w.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.parentElement.innerHTML='${(w.firstName||'?')[0].toUpperCase()}'">`
        : `<span style="font-size:16px;font-weight:800;color:#fff">${(w.firstName||'?')[0].toUpperCase()}</span>`;
      const avatarBg = ['rgba(91,141,239,.3)','rgba(46,204,113,.25)','rgba(244,196,48,.2)'][i] || 'rgba(255,255,255,.1)';
      const amountColor = ['#f4c430','#c0c0c0','#cd7f32'][i] || '#fff';
      const separator = i < d.wins.length - 1
        ? `<div style="height:1px;background:rgba(255,255,255,.05);margin:0 0"></div>`
        : '';
      return `
        <div style="display:flex;align-items:center;gap:14px;padding:14px 0">
          <div style="font-size:20px;width:20px;text-align:center;flex-shrink:0">${medal}</div>
          <div style="width:46px;height:46px;border-radius:14px;background:${avatarBg};border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
            ${avatarContent}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.firstName||'Игрок'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.3);font-weight:600;margin-top:2px">${gameName}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${amountColor}"><ellipse cx="12" cy="18" rx="10" ry="4"/><ellipse cx="12" cy="14" rx="10" ry="4"/><ellipse cx="12" cy="10" rx="10" ry="4"/><ellipse cx="12" cy="6" rx="10" ry="4"/></svg>
            <span style="font-size:15px;font-weight:800;color:${amountColor}">${Number(w.amount).toLocaleString('ru')}</span>
          </div>
        </div>${separator}`;
    }).join('');
  }).catch(()=>{
    list.innerHTML = `<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.3);font-size:13px">Ошибка загрузки</div>`;
  });
}

function closeTopWins(){
  const mo = document.getElementById('top-wins-mo');
  const box = document.getElementById('top-wins-box');
  box.style.transform = 'scale(0.88) translateY(16px)';
  box.style.opacity = '0';
  mo.style.background = 'rgba(0,0,0,0)';
  mo.style.backdropFilter = 'blur(0px)';
  setTimeout(()=>{ mo.style.pointerEvents = 'none'; }, 280);
}

/* ══ SLIDING NAV PILL ══ */
function _navPillUpdate(page){
  const nav  = document.getElementById('main-nav');
  const pill = document.getElementById('nav-pill');
  const btn  = document.getElementById('nb-' + page);
  if(!nav || !pill || !btn) return;
  const navRect = nav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  pill.style.left  = (btnRect.left - navRect.left) + 'px';
  pill.style.width = btnRect.width + 'px';
}
// Init pill on load
(function(){
  function initPill(){
    const active = document.querySelector('.nb.active');
    if(active) _navPillUpdate('home');
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(initPill,80));
  } else {
    setTimeout(initPill, 80);
  }
  window.addEventListener('resize', ()=>{
    const active = document.querySelector('.nb.active');
    if(active){
      const page = active.id.replace('nb-','');
      _navPillUpdate(page);
    }
  });
})();
