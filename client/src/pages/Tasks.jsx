import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BalancePill } from '../components/CoinIcon';
import { TASKS, TASK_ICONS } from '../config/config';

export default function Tasks() {
  const { state, UID, showToast, markTaskDone, syncB } = useApp();
  const [tasks, setTasks] = useState(TASKS);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    async function loadCustom() {
      try {
        const ct = await fetch('/api/tasks/custom').then(r => r.json());
        if (Array.isArray(ct) && ct.length) {
          setTasks(prev => {
            const merged = [...prev];
            ct.forEach(t => { if (!merged.find(x => x.id === t.id)) merged.push(t); });
            return merged;
          });
        }
      } catch {}
      try {
        const ov = await fetch('/api/tasks/overrides').then(r => r.json());
        if (ov && typeof ov === 'object' && !ov.error) {
          setTasks(prev => prev.map(t => {
            const o = ov[t.id];
            if (!o) return t;
            return { ...t, ...Object.fromEntries(Object.entries(o).filter(([k]) => ['rew', 'name', 'desc', 'tag', 'tc', 'order'].includes(k))) };
          }));
        }
      } catch {}
    }
    loadCustom();
  }, []);

  async function doTask(task) {
    if (state.doneTasks.has(task.id)) return;
    if (task.url) window.open(task.url, '_blank');

    if (task.check === 'ref') {
      if (state.refs.length === 0) { showToast('Сначала пригласи друга!', 'r'); return; }
    }
    if (task.check === 'wallet') {
      if (!state.walletAddress) { showToast('Сначала подключи TON кошелёк!', 'r'); return; }
    }

    setLoading(l => ({ ...l, [task.id]: true }));
    try {
      const r = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: UID, taskId: task.id, check: task.check, channel: task.channel }),
      });
      const d = await r.json();
      if (d.ok) {
        markTaskDone(task.id);
        syncB({ balance: state.balance + task.rew });
        showToast(`✅ Задание выполнено! +${task.rew} монет`, 'g');
      } else {
        showToast(d.error || 'Не удалось выполнить', 'r');
      }
    } catch { showToast('Ошибка подключения', 'r'); }
    setLoading(l => ({ ...l, [task.id]: false }));
  }

  const sorted = [...tasks].sort((a, b) => (a.order || a.id) - (b.order || b.id));

  return (
    <div className="page active" id="page-tasks">
      <div className="phdr">
        <div className="ptitle">Задания</div>
        <BalancePill id="b-tasks">{state.balance.toLocaleString('ru')}</BalancePill>
      </div>
      <div className="tasks-hint">
        <svg className="tasks-hint-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6H8.2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z"/></svg>
        Больше заданий появляются еженедельно
      </div>
      <div id="tasks-list">
        {sorted.map(task => {
          const done = state.doneTasks.has(task.id);
          const icoSvg = TASK_ICONS[task.icoKey] || '';
          return (
            <div key={task.id} className={`gc task-item${done ? ' done' : ''}`} style={{ marginBottom: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`task-ico task-ico-${task.tc || 'g'}`} dangerouslySetInnerHTML={{ __html: icoSvg }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span className={`task-tag tc-${task.tc || 'g'}${task.tag === 'NEW' || task.tc === 'new' ? ' tc-new' : ''}`} data-tag={task.tag}>{task.tag}</span>
                    {done && <span style={{ fontSize: '11px', color: 'var(--green)' }}>✅ Выполнено</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{task.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted2)', lineHeight: 1.5 }}>{task.desc}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>+{task.rew}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted2)' }}>монет</div>
                </div>
              </div>
              {!done && (
                <button
                  className="task-btn"
                  style={{ marginTop: '10px', width: '100%', padding: '10px', borderRadius: '12px', background: 'var(--green)', border: 'none', color: '#000', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: loading[task.id] ? 0.6 : 1 }}
                  onClick={() => doTask(task)}
                  disabled={loading[task.id]}
                >
                  {loading[task.id] ? 'Проверка...' : (task.url ? '🔗 Перейти' : '✅ Выполнить')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
