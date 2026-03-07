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
const MEDALS = [
  // 🥇 Gold crystal
  `<svg width="32" height="38" viewBox="0 0 46 54" fill="none"><defs><linearGradient id="jg1" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#FFFDE0"/><stop offset="40%" stop-color="#FFD700"/><stop offset="100%" stop-color="#A06000"/></linearGradient><filter id="jf1"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#FFD700" flood-opacity="0.55"/></filter></defs><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="url(#jg1)" filter="url(#jf1)"/><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/><path d="M23 2 L40 14 L23 20 L6 14 Z" fill="rgba(255,255,255,0.15)"/><path d="M23 52 L40 36 L23 30 L6 36 Z" fill="rgba(0,0,0,0.1)"/><line x1="23" y1="2" x2="23" y2="52" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><text x="23" y="32" text-anchor="middle" font-size="16" font-weight="900" fill="rgba(90,38,0,0.88)" font-family="-apple-system,sans-serif">1</text></svg>`,
  // 🥈 Silver crystal
  `<svg width="32" height="38" viewBox="0 0 46 54" fill="none"><defs><linearGradient id="jg2" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#FAFAFA"/><stop offset="40%" stop-color="#C8C8D8"/><stop offset="100%" stop-color="#707080"/></linearGradient><filter id="jf2"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#aaa" flood-opacity="0.4"/></filter></defs><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="url(#jg2)" filter="url(#jf2)"/><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/><path d="M23 2 L40 14 L23 20 L6 14 Z" fill="rgba(255,255,255,0.18)"/><path d="M23 52 L40 36 L23 30 L6 36 Z" fill="rgba(0,0,0,0.08)"/><line x1="23" y1="2" x2="23" y2="52" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><text x="23" y="32" text-anchor="middle" font-size="16" font-weight="900" fill="rgba(25,25,50,0.82)" font-family="-apple-system,sans-serif">2</text></svg>`,
  // 🥉 Bronze crystal
  `<svg width="32" height="38" viewBox="0 0 46 54" fill="none"><defs><linearGradient id="jg3" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#F8C090"/><stop offset="40%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#7A3510"/></linearGradient><filter id="jf3"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#cd7f32" flood-opacity="0.45"/></filter></defs><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="url(#jg3)" filter="url(#jf3)"/><path d="M23 2 L40 14 L40 36 L23 52 L6 36 L6 14 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/><path d="M23 2 L40 14 L23 20 L6 14 Z" fill="rgba(255,255,255,0.13)"/><path d="M23 52 L40 36 L23 30 L6 36 Z" fill="rgba(0,0,0,0.1)"/><line x1="23" y1="2" x2="23" y2="52" stroke="rgba(255,255,255,0.07)" stroke-width="1"/><text x="23" y="32" text-anchor="middle" font-size="16" font-weight="900" fill="rgba(48,14,0,0.88)" font-family="-apple-system,sans-serif">3</text></svg>`,
];
const GAME_NAMES = { solo: 'Соло', duel: 'Дуэль', mines: 'Мины' };

function openTopWins(){
  const mo = document.getElementById('top-wins-mo');
  const box = document.getElementById('top-wins-box');
  const list = document.getElementById('top-wins-list');
  if(!mo || !box || !list) return;

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
  fetch('/api/wins/top')
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => {
      if(!d || !d.wins || d.wins.length === 0){
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
        const initial = (w.firstName||'?')[0].toUpperCase();
        const avatarContent = w.photoUrl
          ? `<img src="${w.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.outerHTML='<span style=font-size:16px;font-weight:800;color:#fff>${initial}</span>'">`
          : `<span style="font-size:16px;font-weight:800;color:#fff">${initial}</span>`;
        const avatarBg = ['rgba(91,141,239,.3)','rgba(46,204,113,.25)','rgba(244,196,48,.2)'][i] || 'rgba(255,255,255,.1)';
        const amountColor = ['#f4c430','#c0c0c0','#cd7f32'][i] || '#fff';
        const sep = i < d.wins.length-1 ? `<div style="height:1px;background:rgba(255,255,255,.05)"></div>` : '';
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 0">
          <div style="width:32px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${medal}</div>
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
          </div>${sep}`;
      }).join('');
    })
    .catch(() => {
      list.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:28px 0;gap:10px">
          <div style="font-size:36px;opacity:.4">🏆</div>
          <div style="font-size:13px;color:rgba(255,255,255,.3);text-align:center;line-height:1.5">Пока нет выигрышей<br>больше 30 000 🪙 за сегодня</div>
        </div>`;
    });
}

function closeTopWins(){
  const mo = document.getElementById('top-wins-mo');
  const box = document.getElementById('top-wins-box');
  if(!mo || !box) return;
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
