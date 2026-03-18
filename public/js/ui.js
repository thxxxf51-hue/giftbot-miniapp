/* ══ NAVIGATION ══ */
const PAGES=['home','tasks','shop','inventory','raffles','friends','profile','pvp'];
let curPage='home',navLk=false;

function go(name){
  if(name===curPage||navLk)return;
  navLk=true;
  // Если сплэш ещё виден — убираем немедленно
  const _sp=document.getElementById('splash-screen');
  if(_sp){_sp.style.display='none';if(_sp.parentNode)_sp.parentNode.removeChild(_sp);}
  // Page leave hooks
  if(curPage==='pvp') onPvpPageLeave?.();

  const old=document.getElementById('page-'+curPage);
  const nw=document.getElementById('page-'+name);
  old.classList.add('exit');
  old.addEventListener('animationend',()=>{old.classList.remove('active','exit');old.style.display='none';},{once:true});
  // Failsafe: always release navLk after 600ms in case animationend doesn't fire
  const _navLkTimer = setTimeout(()=>{ navLk=false; }, 600);
  setTimeout(()=>{
    nw.style.display='block';
    nw.classList.add('active');
    nw.addEventListener('animationend',()=>{clearTimeout(_navLkTimer);navLk=false;},{once:true});
    // Page enter hooks (inside setTimeout so page is visible)
    if(name==='inventory')renderInv();
    if(name==='pvp')onPvpPageEnter?.();
    if(name==='admin')loadAdminSection(admTab);
    if(name==='profile')loadTxList();
  },60);
  PAGES.forEach(p=>document.getElementById('nb-'+p)?.classList.remove('active'));
  document.getElementById('nb-'+name)?.classList.add('active');
  // slide nav pill
  if(typeof _navPillUpdate==='function') _navPillUpdate(name);
  curPage=name;syncB();
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
/* ── Medal canvas renderer ── */
function _drawMedal(canvas, cfg, label) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const pad = W * 0.12;
  const sx = (W - pad*2) / 46, sy = (H - pad*2) / 54;
  const ox = pad, oy = pad;
  const pts = [[23,2],[40,14],[40,36],[23,52],[6,36],[6,14]].map(([x,y])=>[x*sx+ox, y*sy+oy]);
  const loop = [...pts, pts[0]];
  // fill
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0,0,W,H);
  fg.addColorStop(0, cfg.fill[0]); fg.addColorStop(1, cfg.fill[1]);
  ctx.fillStyle=fg; ctx.fill();
  // top facet
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); ctx.lineTo(pts[1][0],pts[1][1]); ctx.lineTo(pts[5][0],pts[5][1]); ctx.closePath();
  ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill();
  // compute perimeter
  const segs=[]; let tot=0;
  for(let i=0;i<pts.length;i++){const a=loop[i],b=loop[i+1];const l=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push(l);tot+=l;}
  function sample(t){const s=cfg.stops;if(t<=s[0].t)return s[0].c;if(t>=s[s.length-1].t)return s[s.length-1].c;for(let i=0;i<s.length-1;i++){if(t>=s[i].t&&t<=s[i+1].t){const f=(t-s[i].t)/(s[i+1].t-s[i].t);return s[i].c.map((v,j)=>v+f*(s[i+1].c[j]-v));}}return s[0].c;}
  function cr(c){return `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${c[3].toFixed(2)})`;}
  const sw = W*0.055;
  let cum=0;
  for(let i=0;i<pts.length;i++){
    const a=loop[i],b=loop[i+1];
    const t0=cum/tot, t1=(cum+segs[i])/tot; cum+=segs[i];
    const c0=sample(t0), c1=sample(t1);
    // glow
    ctx.save(); ctx.shadowColor=cfg.glow; ctx.shadowBlur=sw*2.8;
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]);
    const gg=ctx.createLinearGradient(a[0],a[1],b[0],b[1]);
    gg.addColorStop(0,cr([c0[0],c0[1],c0[2],c0[3]*0.5]));
    gg.addColorStop(1,cr([c1[0],c1[1],c1[2],c1[3]*0.5]));
    ctx.strokeStyle=gg; ctx.lineWidth=sw*2; ctx.lineCap='round'; ctx.stroke(); ctx.restore();
    // sharp
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]);
    const sg=ctx.createLinearGradient(a[0],a[1],b[0],b[1]);
    sg.addColorStop(0,cr(c0)); sg.addColorStop(1,cr(c1));
    ctx.strokeStyle=sg; ctx.lineWidth=sw; ctx.lineCap='round'; ctx.stroke();
  }
  // number
  ctx.font=`900 ${W*0.28}px -apple-system,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=cfg.text; ctx.fillText(label, W/2, H*0.535);
}

const _MEDAL_CFGS = [
  { fill:['#1e1500','#0e0900'], glow:'#FFD700', text:'rgba(255,210,50,0.9)',
    stops:[{t:0,c:[100,60,0,0.35]},{t:0.2,c:[220,150,0,1]},{t:0.4,c:[255,230,80,1]},{t:0.55,c:[255,255,200,1]},{t:0.7,c:[255,210,50,1]},{t:0.85,c:[180,100,0,0.65]},{t:1,c:[100,60,0,0.35]}] },
  { fill:['#0e0e1a','#08080f'], glow:'#aabbff', text:'rgba(180,200,255,0.9)',
    stops:[{t:0,c:[60,70,120,0.35]},{t:0.2,c:[120,140,210,1]},{t:0.4,c:[190,210,255,1]},{t:0.55,c:[240,248,255,1]},{t:0.7,c:[160,185,240,1]},{t:0.85,c:[90,100,170,0.65]},{t:1,c:[60,70,120,0.35]}] },
  { fill:['#160900','#0d0500'], glow:'#CD7F32', text:'rgba(230,145,60,0.9)',
    stops:[{t:0,c:[80,35,5,0.35]},{t:0.2,c:[180,90,20,1]},{t:0.4,c:[230,150,60,1]},{t:0.55,c:[255,215,140,1]},{t:0.7,c:[210,130,40,1]},{t:0.85,c:[140,65,15,0.65]},{t:1,c:[80,35,5,0.35]}] },
];

// Returns an <canvas> element with medal drawn (22x26px display size)
function _makeMedalCanvas(idx) {
  const c = document.createElement('canvas');
  c.width = 44; c.height = 52;
  c.style.cssText = 'width:22px;height:26px;display:block;flex-shrink:0';
  _drawMedal(c, _MEDAL_CFGS[idx] || _MEDAL_CFGS[2], idx+1);
  return c;
}

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
      list.innerHTML = '';
      d.wins.forEach((w, i) => {
        const gameName = GAME_NAMES[w.game] || w.game;
        const initial = (w.firstName||'?')[0].toUpperCase();
        const avatarContent = w.photoUrl
          ? `<img src="${w.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.outerHTML='<span style=font-size:14px;font-weight:800;color:#fff>${initial}</span>'">`
          : `<span style="font-size:14px;font-weight:800;color:#fff">${initial}</span>`;
        const avatarBg = ['rgba(91,141,239,.3)','rgba(46,204,113,.25)','rgba(244,196,48,.2)'][i] || 'rgba(255,255,255,.1)';
        const amountColor = ['#f4c430','#c0c0c0','#cd7f32'][i] || '#fff';
        const sep = i < d.wins.length-1 ? `<div style="height:1px;background:rgba(255,255,255,.05)"></div>` : '';
        const row = document.createElement('div');
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;padding:13px 0">
            <div class="medal-slot" style="width:22px;height:26px;flex-shrink:0"></div>
            <div style="width:44px;height:44px;border-radius:12px;background:${avatarBg};border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
              ${avatarContent}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.firstName||'Игрок'}</div>
              <div style="font-size:11px;color:rgba(255,255,255,.3);font-weight:600;margin-top:2px">${gameName}</div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${amountColor}"><ellipse cx="12" cy="18" rx="10" ry="4"/><ellipse cx="12" cy="14" rx="10" ry="4"/><ellipse cx="12" cy="10" rx="10" ry="4"/><ellipse cx="12" cy="6" rx="10" ry="4"/></svg>
              <span style="font-size:14px;font-weight:800;color:${amountColor}">${Number(w.amount).toLocaleString('ru')}</span>
            </div>
          </div>${sep}`;
        const slot = row.querySelector('.medal-slot');
        if (slot) slot.appendChild(_makeMedalCanvas(i));
        list.appendChild(row);
      });
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

/* ══ ACCENT THEME ══ */
const ACCENT_THEMES = [
  { id:'green',   name:'Зелёный',     color:'#2ecc71', dark:'#27ae60', r:46,  g:204, b:113 },
  { id:'blue',    name:'Синий',       color:'#4a9eff', dark:'#2d7dd2', r:74,  g:158, b:255 },
  { id:'purple',  name:'Фиолет.',     color:'#a855f7', dark:'#8b3fe8', r:168, g:85,  b:247 },
  { id:'orange',  name:'Оранжевый',   color:'#ff8c42', dark:'#e07230', r:255, g:140, b:66  },
  { id:'pink',    name:'Розовый',     color:'#ff6b9d', dark:'#e0507f', r:255, g:107, b:157 },
];

function applyAccent(id, persist) {
  if (persist === undefined) persist = true;
  const t = ACCENT_THEMES.find(x => x.id === id) || ACCENT_THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--green',  t.color);
  root.style.setProperty('--green2', t.dark);
  root.style.setProperty('--gdim',   `rgba(${t.r},${t.g},${t.b},0.12)`);
  root.style.setProperty('--gbor',   `rgba(${t.r},${t.g},${t.b},0.25)`);
  root.style.setProperty('--ar', t.r);
  root.style.setProperty('--ag', t.g);
  root.style.setProperty('--ab', t.b);
  if (persist) localStorage.setItem('gb_accent', t.id);
  const lbl = document.getElementById('p-accent-val');
  if (lbl) { lbl.textContent = t.name; lbl.style.color = t.color; }
  _accentUpdatePpu(t.id);
}

function _accentLoadSaved() {
  const saved = localStorage.getItem('gb_accent') || 'green';
  applyAccent(saved, false);
}

function _accentUpdatePpu(activeId) {
  const row = document.getElementById('ppu-accent-row');
  if (!row) return;
  row.innerHTML = ACCENT_THEMES.map(t =>
    `<div class="ppu-ac-dot${t.id===activeId?' ppu-ac-sel':''}" style="background:${t.color}" title="${t.name}" onclick="event.stopPropagation();applyAccent('${t.id}')"></div>`
  ).join('');
}

function openAccentPicker() {
  const grid = document.getElementById('ac-grid');
  if (!grid) return;
  const activeId = localStorage.getItem('gb_accent') || 'green';
  grid.innerHTML = ACCENT_THEMES.map(t => `
    <div class="ac-item${t.id===activeId?' ac-sel':''}" onclick="applyAccent('${t.id}');_accentRefreshGrid('${t.id}')">
      <div class="ac-dot" style="background:linear-gradient(135deg,${t.color},${t.dark})">
        <div class="ac-check">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
      <div class="ac-name">${t.name}</div>
    </div>`).join('');
  document.getElementById('acmo').classList.add('show');
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch{}
}

function _accentRefreshGrid(activeId) {
  document.querySelectorAll('#ac-grid .ac-item').forEach((el, i) => {
    el.classList.toggle('ac-sel', ACCENT_THEMES[i]?.id === activeId);
  });
}

function closeAccentPicker() {
  document.getElementById('acmo').classList.remove('show');
}

_accentLoadSaved();
