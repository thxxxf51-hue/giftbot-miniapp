export default function CoinIcon({ size = 'currentColor', stroke = '#2ecc71', strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7"/>
      <path d="M19.5 9.94a7 7 0 11-9.56 9.56"/>
      <path d="M7 6h1v4"/>
      <path d="M17.3 14.3l.7.7-2.8 2.8"/>
    </svg>
  );
}

export function BalancePill({ id, children }) {
  return (
    <div className="bpill">
      <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="7"/>
        <path d="M19.5 9.94a7 7 0 11-9.56 9.56"/>
        <path d="M7 6h1v4"/>
        <path d="M17.3 14.3l.7.7-2.8 2.8"/>
      </svg>
      <span id={id}>{children}</span>
    </div>
  );
}
