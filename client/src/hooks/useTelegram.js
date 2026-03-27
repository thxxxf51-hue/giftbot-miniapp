const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#0a0a0a'); tg.setBackgroundColor('#0a0a0a'); } catch (e) {}
}

function parseTGUser() {
  try {
    const u = tg?.initDataUnsafe?.user;
    if (u && u.id && u.id !== 0) return u;
    const raw = tg?.initData || '';
    const params = new URLSearchParams(raw);
    const userStr = params.get('user');
    if (userStr) {
      const p = JSON.parse(decodeURIComponent(userStr));
      if (p && p.id) return p;
    }
  } catch (e) {}
  return { id: 123456, first_name: 'Dev', username: 'dev', photo_url: null };
}

export const TGU = parseTGUser();
export const UID = String(TGU.id);
export { tg };
