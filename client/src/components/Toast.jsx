import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast g ${toast.show ? 'show' : ''} ${toast.type}`}>
      {toast.msg}
    </div>
  );
}
