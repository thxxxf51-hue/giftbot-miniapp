import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [barW, setBarW] = useState(0);
  const [text, setText] = useState('Загрузка...');

  useEffect(() => {
    const steps = [
      { w: 18,  t: 'Инициализация...',  delay: 350 },
      { w: 40,  t: 'Загрузка данных...', delay: 600 },
      { w: 65,  t: 'Подключение...',     delay: 550 },
      { w: 85,  t: 'Почти готово...',    delay: 500 },
      { w: 100, t: 'Готово!',            delay: 400 },
    ];
    let i = 0;
    let timer;
    function nextStep() {
      if (i >= steps.length) { setTimeout(onDone, 600); return; }
      const s = steps[i++];
      setBarW(s.w);
      setText(s.t);
      timer = setTimeout(nextStep, s.delay);
    }
    timer = setTimeout(nextStep, 400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div id="splash-screen">
      <div className="splash-glow"></div>
      <div className="splash-logo-wrap">
        <div className="splash-logo" style={{ overflow: 'hidden' }}>
          <div className="splash-glare"></div>
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8"  y="8"  width="14" height="14" rx="3.5" fill="#bedd30" style={{ '--op': 1 }} />
            <rect x="26" y="8"  width="14" height="14" rx="3.5" fill="#bedd30" opacity=".65" style={{ '--op': .65 }} />
            <rect x="8"  y="26" width="14" height="14" rx="3.5" fill="#bedd30" opacity=".65" style={{ '--op': .65 }} />
            <rect x="26" y="26" width="14" height="14" rx="3.5" fill="#bedd30" opacity=".3"  style={{ '--op': .3 }} />
          </svg>
        </div>
        <div className="splash-rings">
          <div className="splash-ring splash-ring1"></div>
          <div className="splash-ring splash-ring2"></div>
        </div>
      </div>
      <div className="splash-texts">
        <div className="splash-name">
          <span className="splash-sat">SatApp</span><span className="splash-gifts"> Gifts</span>
        </div>
        <div className="splash-tagline">Играй · Выигрывай · Выводи</div>
      </div>
      <div className="splash-bar-wrap">
        <div className="splash-bar-bg">
          <div className="splash-bar-fill" style={{ width: barW + '%' }}></div>
        </div>
        <div className="splash-pct">{text}</div>
      </div>
      <div className="splash-dots">
        <div className="splash-dot"></div>
        <div className="splash-dot"></div>
        <div className="splash-dot"></div>
      </div>
    </div>
  );
}
