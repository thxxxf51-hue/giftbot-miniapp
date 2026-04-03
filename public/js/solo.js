/* ══ SOLO WHEEL ══ */
const SOLO_PRIZES       = [500,1000,2500,3500,5500,7777,10000,15000,25000,35000,50000];
const SOLO_CHANCE_STEPS = [1,3,5,7,10,15,20,25,30,35,40,45,50,55,60,65];
const SOLO_COLORS = [
  ['#2ecc71','#1a9e52'],['#3498db','#1f6fa3'],['#9b59b6','#6c3483'],
  ['#e74c3c','#a93226'],['#f39c12','#b7770d'],['#1abc9c','#0e8a72'],
  ['#e91e63','#880e4f'],['#ff5722','#bf360c'],['#ffd700','#b8860b'],
  ['#00bcd4','#006064'],['#ff6b6b','#c0392b'],
];
function soloColor(idx){ return SOLO_COLORS[idx%SOLO_COLORS.length]; }
function soloCost(prize,pct){ return Math.max(10,Math.round(prize*(pct/100)*1.18/10)*10); }

let _soloCanvas=null,_soloRot=0,_soloSpinning=false,_soloCountdown=0;
let _soloPrizeIdx=0,_soloChanceIdx=4;
let _soloDragging=false,_soloSliderEl=null;

function _soloRedraw(){ _soloDrawWheel(_soloCanvas,SOLO_CHANCE_STEPS[_soloChanceIdx],_soloPrizeIdx,_soloRot); }

function _soloDrawWheel(canvas,chancePct,prizeIdx,rotation){
  if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const size=canvas.clientWidth||300;
  if(canvas.width!==size*dpr){canvas.width=size*dpr;canvas.height=size*dpr;}
  const ctx=canvas.getContext('2d');
  ctx.save();ctx.scale(dpr,dpr);
  const W=size,H=size,cx=W/2,cy=H/2,R=Math.min(W,H)/2-6,innerR=R*0.36;
  ctx.clearRect(0,0,W,H);

  const winAngle=(chancePct/100)*Math.PI*2;
  const winStart=-Math.PI/2+rotation;
  const winEnd=winStart+winAngle;

  // lose sector
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,winEnd,winStart+Math.PI*2);ctx.closePath();
  const lg=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
  lg.addColorStop(0,'#1a1a24');lg.addColorStop(1,'#14141c');
  ctx.fillStyle=lg;ctx.fill();

  // No Loot
  const loseAngle=Math.PI*2-winAngle,midLose=winEnd+loseAngle/2;
  ctx.save();ctx.translate(cx+Math.cos(midLose)*R*0.65,cy+Math.sin(midLose)*R*0.65);
  ctx.rotate(midLose+Math.PI/2);ctx.fillStyle='rgba(255,255,255,0.1)';
  ctx.font=`600 ${R*0.085}px -apple-system,sans-serif`;ctx.textAlign='center';ctx.fillText('No Loot',0,0);ctx.restore();

  // win sector
  const [c1,c2]=soloColor(prizeIdx),midWin=winStart+winAngle/2;
  const wg=ctx.createLinearGradient(cx+Math.cos(winStart+0.1)*R*0.6,cy+Math.sin(winStart+0.1)*R*0.6,cx+Math.cos(winEnd-0.1)*R*0.6,cy+Math.sin(winEnd-0.1)*R*0.6);
  wg.addColorStop(0,c1);wg.addColorStop(1,c2);
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,winStart,winEnd);ctx.closePath();ctx.fillStyle=wg;ctx.fill();

  // shine
  const sg=ctx.createRadialGradient(cx+Math.cos(midWin)*R*0.4,cy+Math.sin(midWin)*R*0.4,0,cx+Math.cos(midWin)*R*0.4,cy+Math.sin(midWin)*R*0.4,R*0.5);
  sg.addColorStop(0,'rgba(255,255,255,0.18)');sg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,winStart,winEnd);ctx.closePath();ctx.fillStyle=sg;ctx.fill();

  // prize label
  if(chancePct>=10){
    ctx.save();ctx.translate(cx+Math.cos(midWin)*R*0.62,cy+Math.sin(midWin)*R*0.62);ctx.rotate(midWin+Math.PI/2);
    ctx.fillStyle='rgba(255,255,255,0.95)';ctx.font=`bold ${Math.min(R*0.095,14)}px -apple-system,sans-serif`;ctx.textAlign='center';
    const p=SOLO_PRIZES[prizeIdx];ctx.fillText(p>=1000?(p/1000)+'K 🪙':p+' 🪙',0,0);ctx.restore();
  }

  // dividers
  ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1.5;
  [winStart,winEnd].forEach(a=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.stroke();});

  // inner circle
  const ig=ctx.createRadialGradient(cx,cy,0,cx,cy,innerR);
  ig.addColorStop(0,'#0e0e16');ig.addColorStop(1,'#12121a');
  ctx.beginPath();ctx.arc(cx,cy,innerR,0,Math.PI*2);ctx.fillStyle=ig;ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=2;ctx.stroke();

  // center text: countdown during spin, "Ожидание" when idle
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(_soloSpinning && _soloCountdown > 0){
    // big number
    ctx.font=`900 ${Math.round(innerR*0.36)}px -apple-system,sans-serif`;
    ctx.fillStyle='#ffffff';
    ctx.fillText(_soloCountdown, cx, cy - innerR*0.04);
    // small "сек" below
    ctx.font=`600 ${Math.round(innerR*0.15)}px -apple-system,sans-serif`;
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillText('сек', cx, cy + innerR*0.28);
  } else {
    ctx.fillStyle='rgba(255,255,255,0.42)';
    ctx.font=`600 ${Math.min(innerR*0.35,12)}px -apple-system,sans-serif`;
    ctx.fillText(_soloSpinning?'...':'Ожидание', cx, cy);
  }
  ctx.textBaseline='alphabetic';

  // sparkles
  [[0.05,0.1],[0.92,0.08],[0.03,0.75],[0.95,0.85],[0.5,0.02],[0.5,0.98]].forEach(([sx,sy])=>{
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(sx*W-1,sy*H-1,2,2);
  });
  ctx.restore();
}

function soloRenderUI(){
  const pct=SOLO_CHANCE_STEPS[_soloChanceIdx],prize=SOLO_PRIZES[_soloPrizeIdx];
  const cost=soloCost(prize,pct),[c1]=soloColor(_soloPrizeIdx);
  const steps=SOLO_CHANCE_STEPS.length,canAfford=S.balance>=cost;

  const lbl=document.getElementById('solo-chance-lbl');
  if(lbl){lbl.textContent=`Шанс ${pct}%`;lbl.style.color=c1;}

  const fill=document.getElementById('solo-slider-fill');
  if(fill){fill.style.width=`${(_soloChanceIdx/(steps-1))*100}%`;fill.style.background=`linear-gradient(90deg,${c1}88,${c1})`;}

  document.querySelectorAll('.solo-dot').forEach((d,i)=>{
    const isSel=i===_soloChanceIdx;
    d.style.width=isSel?'22px':'8px';d.style.height=isSel?'22px':'8px';
    d.style.left=`calc(${(i/(steps-1))*100}% + 8px - ${isSel?11:4}px)`;
    d.style.background=i<=_soloChanceIdx?c1:'rgba(255,255,255,.18)';
    d.style.border=isSel?`2.5px solid rgba(255,255,255,.7)`:'none';
    d.style.boxShadow=isSel?`0 0 8px ${c1}88`:'none';
  });

  const btn=document.getElementById('solo-spin-btn');
  if(btn){
    btn.textContent=_soloSpinning?'⏳ Крутится...':`Крутить за ${cost.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>`;
    btn.style.background=canAfford&&!_soloSpinning?`linear-gradient(135deg,${c1},${c1}cc)`:'rgba(255,255,255,.07)';
    btn.style.color=canAfford&&!_soloSpinning?'#000':'rgba(255,255,255,.25)';
    btn.style.boxShadow=canAfford&&!_soloSpinning?`0 4px 22px ${c1}55`:'none';
    btn.disabled=_soloSpinning||!canAfford;
  }
  // Disable prize picker button while spinning
  const prizeBtn=document.getElementById('solo-prize-btn');
  if(prizeBtn){
    prizeBtn.disabled=_soloSpinning;
    prizeBtn.style.opacity=_soloSpinning?'0.35':'1';
    prizeBtn.style.cursor=_soloSpinning?'not-allowed':'pointer';
  }
  const pval=document.getElementById('solo-prize-val');
  if(pval){pval.innerHTML=prize.toLocaleString('ru')+' <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg>';pval.style.color=c1;}
  _soloRedraw();
}

function initSoloPage(){
  _soloCanvas=document.getElementById('solo-canvas');
  _soloSliderEl=document.getElementById('solo-slider');
  if(!_soloCanvas)return;

  const dotsEl=document.getElementById('solo-dots');
  if(dotsEl&&!dotsEl.children.length){
    SOLO_CHANCE_STEPS.forEach((_,i)=>{
      const d=document.createElement('div');d.className='solo-dot';
      d.style.cssText='position:absolute;border-radius:50%;transition:all .15s;z-index:2;cursor:pointer;';
      dotsEl.appendChild(d);
    });
  }

  const grid=document.getElementById('solo-prize-grid');
  if(grid&&!grid.children.length){
    SOLO_PRIZES.forEach((p,i)=>{
      const btn=document.createElement('button');
      btn.className='solo-pgrid-btn';btn.dataset.idx=i;
      btn.innerHTML=`<span>${p>=1000?(p/1000)+'K':p}</span><span style="font-size:9px;opacity:.5">🪙</span>`;
      btn.onclick=()=>{_soloPrizeIdx=i;soloClosePrizePicker();soloRenderUI();};
      grid.appendChild(btn);
    });
  }

  if(window._soloRO)window._soloRO.disconnect();
  window._soloRO=new ResizeObserver(()=>_soloRedraw());
  window._soloRO.observe(_soloCanvas);
  soloRenderUI();
}

function soloSpin(){
  const pct=SOLO_CHANCE_STEPS[_soloChanceIdx],prize=SOLO_PRIZES[_soloPrizeIdx];
  const cost=soloCost(prize,pct);
  if(_soloSpinning||S.balance<cost)return;
  S.balance-=cost;syncB();
  _soloSpinning=true;soloClosePrizePicker();soloRenderUI();

  const win=Math.random()*100<pct;
  const extraSpins=(5+Math.floor(Math.random()*4))*Math.PI*2;
  const winAngle=(pct/100)*Math.PI*2;

  /*
   * Pointer is fixed at top (angle -π/2).
   * Win sector = [-π/2+rot, -π/2+rot+winAngle].
   * Pointer is in WIN sector when rotation mod 2π ∈ [2π-winAngle, 2π).
   * Pointer is in LOSE sector when rotation mod 2π ∈ [0, 2π-winAngle).
   */
  let targetOffset;
  if(win){ targetOffset=Math.PI*2-winAngle*(0.25+Math.random()*0.5); }
  else   { targetOffset=(Math.PI*2-winAngle)*(0.1+Math.random()*0.8); }

  const startRot=_soloRot;
  const currentNorm=((startRot%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  const needed=((targetOffset-currentNorm)+Math.PI*2*10)%(Math.PI*2);
  const endRot=startRot+extraSpins+needed;
  const dur=4200,t0=performance.now();
  _soloCountdown=Math.ceil(dur/1000); // start at 4
  const ease=t=>1-Math.pow(1-t,4);

  function frame(now){
    const t=Math.min((now-t0)/dur,1);
    // update countdown: remaining seconds (1..4), clamp to 1 when nearly done
    _soloCountdown=Math.max(1,Math.ceil((1-t)*dur/1000));
    _soloRot=startRot+(endRot-startRot)*ease(t);
    _soloDrawWheel(_soloCanvas,pct,_soloPrizeIdx,_soloRot);
    if(t<1){requestAnimationFrame(frame);}
    else{
      _soloCountdown=0;
      _soloSpinning=false;
      if(win){S.balance+=prize;syncB();
        // Записываем чистую прибыль (prize - cost) в глобальную статистику
        const _net=prize-cost;
        if(_net>0)fetch('/api/global-earned/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:_net})}).catch(()=>{});
      }
      soloRenderUI();
      const ico=win
        ?'<img src="/icons/check-circle.svg" width="16" height="16" style="display:block;flex-shrink:0">'
        :'<img src="/icons/x-circle.svg" width="16" height="16" style="display:block;flex-shrink:0">';
      toast(win?`+${prize.toLocaleString('ru')} <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;flex-shrink:0"><circle cx="8" cy="8" r="7"/><path d="M19.5 9.94a7 7 0 11-9.56 9.56"/><path d="M7 6h1v4"/><path d="M17.3 14.3l.7.7-2.8 2.8"/></svg> Победа!`:'Не повезло',win?'g':'r',ico);
    }
  }
  requestAnimationFrame(frame);
}

function soloOpenPrizePicker(){
  if(_soloSpinning) return; // locked while wheel is spinning
  const mo=document.getElementById('solo-prize-mo');if(!mo)return;
  document.querySelectorAll('.solo-pgrid-btn').forEach((b,i)=>{
    const [pc]=soloColor(i);
    b.style.background=i===_soloPrizeIdx?`${pc}22`:'rgba(255,255,255,.05)';
    b.style.border=`1px solid ${i===_soloPrizeIdx?pc:'rgba(255,255,255,.08)'}`;
    b.style.color=i===_soloPrizeIdx?pc:'rgba(255,255,255,.6)';
  });
  mo.classList.add('show');
}
function soloClosePrizePicker(){ document.getElementById('solo-prize-mo')?.classList.remove('show'); }

function _soloUpdateSlider(e){
  const el=_soloSliderEl;if(!el)return;
  const rect=el.getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  const ratio=Math.max(0,Math.min(1,(cx-rect.left)/rect.width));
  _soloChanceIdx=Math.round(ratio*(SOLO_CHANCE_STEPS.length-1));
  soloRenderUI();
}
function soloSliderDown(e){if(_soloSpinning)return;_soloDragging=true;_soloUpdateSlider(e);}
function soloSliderMove(e){if(_soloDragging)_soloUpdateSlider(e);}
function soloSliderUp(){_soloDragging=false;}

function soloPrizeMinus(){if(!_soloSpinning){_soloPrizeIdx=Math.max(0,_soloPrizeIdx-1);soloRenderUI();}}
function soloPrizePlus() {if(!_soloSpinning){_soloPrizeIdx=Math.min(SOLO_PRIZES.length-1,_soloPrizeIdx+1);soloRenderUI();}}
