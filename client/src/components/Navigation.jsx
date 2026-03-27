import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  {
    id: 'home', label: 'Главная',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'tasks', label: 'Задания',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    id: 'shop', label: 'Магазин',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>,
  },
  {
    id: 'pvp', label: 'PvP',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="m2.75 9.25 1.5 2.5 2 1.5m-4.5 0 1 1m1.5-2.5-1.5 1.5m3-1 8.5-8.5v-2h-2l-8.5 8.5"/><path d="m10.25 12.25-2.25-2.25m2-2 2.25 2.25m1-1-1.5 2.5-2 1.5m4.5 0-1 1m-1.5-2.5 1.5 1.5m-7.25-5.25-4.25-4.25v-2h2l4.25 4.25"/></svg>,
  },
  {
    id: 'profile', label: 'Профиль',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function Navigation() {
  const { currentPage, go } = useApp();

  return (
    <div className="nav-wrap">
      <nav className="nav" id="main-nav">
        <div className="nav-pill" id="nav-pill"></div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nb${currentPage === item.id ? ' active' : ''}`}
            id={`nb-${item.id}`}
            onClick={() => go(item.id)}
          >
            <div className="nb-icon">{item.icon}</div>
            <span className="nb-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
