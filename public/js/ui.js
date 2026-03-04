/* ══ NAVIGATION ══ */
const PAGES=['home','tasks','shop','inventory','raffles','friends','profile'];
let curPage='home',navLk=false;

function go(name){
  if(name===curPage||navLk)return;
  navLk=true;
  const old=document.getElementById('page-'+curPage);
  const nw=document.getElementById('page-'+name);
  old.classList.add('exit');
  old.addEventListener('animationend',()=>{old.classList.remove('active','exit');old.style.display='none';},{once:true});
  setTimeout(()=>{nw.style.display='block';nw.classList.add('active');nw.addEventListener('animationend',()=>{navLk=false;},{once:true});},60);
  PAGES.forEach(p=>document.getElementById('nb-'+p)?.classList.remove('active'));
  document.getElementById('nb-'+name)?.classList.add('active');
  curPage=name;syncB();
  if(name==='inventory')renderInv();
}

/* ══ TOAST ══ */
let _tt;
function toast(msg,type='g'){
  const el=document.getElementById('toast');
  el.textContent=msg;el.className='toast '+type+' show';
  clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),2500);
}

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
function closeGenMo(){document.getElementById('genmo').classList.remove('show');_gmCb=null;}
function doGenMo(){if(_gmCb)_gmCb();}
