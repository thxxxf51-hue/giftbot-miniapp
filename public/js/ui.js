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

const PROMO_ICO='<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiUyMzJlY2M3MSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBvbHlsaW5lIHBvaW50cz0iOSAxMiAxMS41IDE0LjUgMTYgOS41Ii8+PC9zdmc+" width="18" height="18" style="display:block;flex-shrink:0">';

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
