const { Telegraf } = require('telegraf');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6151671553;
const APP_URL = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '');
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '';
const GITHUB_REPO = 'thxxxf51-hue/giftbot-miniapp';

/* ══ GITHUB DB BACKUP ══ */
async function backupDBToGitHub() {
  if (!GITHUB_TOKEN) return false;
  try {
    const content = Buffer.from(JSON.stringify(DB), 'utf8').toString('base64');
    let sha;
    const getR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json?ref=db-backup`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (getR.ok) { const d = await getR.json(); sha = d.sha; }
    const body = { message: `db backup ${new Date().toISOString()}`, content, branch: 'db-backup' };
    if (sha) body.sha = sha;
    const putR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (putR.ok) { console.log('✅ DB backed up to GitHub'); return true; }
    const err = await putR.json();
    console.log('GitHub backup error:', err.message);
    return false;
  } catch (e) { console.log('GitHub backup error:', e.message); return false; }
}

async function restoreDBFromGitHub() {
  if (!GITHUB_TOKEN) return false;
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json?ref=db-backup`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return false;
    const data = await r.json();
    const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    const parsed = JSON.parse(content);
    const localUsers = Object.keys(DB.users || {}).length;
    const backupUsers = Object.keys(parsed.users || {}).length;
    if (backupUsers > localUsers) {
      Object.assign(DB, parsed);
      saveDB();
      console.log(`✅ DB restored from GitHub backup (${backupUsers} users > local ${localUsers})`);
      return true;
    }
    return false;
  } catch (e) { console.log('GitHub restore error:', e.message); return false; }
}

async function ensureDbBackupBranch() {
  if (!GITHUB_TOKEN) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/branches/db-backup`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (r.ok) return;
    const mainR = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/main`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!mainR.ok) return;
    const mainData = await mainR.json();
    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs`, {
      method: 'POST',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'refs/heads/db-backup', sha: mainData.object.sha })
    });
    console.log('✅ Created db-backup branch on GitHub');
  } catch (e) { console.log('ensureDbBackupBranch error:', e.message); }
}

if (!BOT_TOKEN) { console.error('BOT_TOKEN not set!'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

/* ══ PERSISTENT DB ══ */
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'db.json');
// Убедимся что директория для БД существует
try { fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }); } catch {}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const saved = JSON.parse(raw);
      console.log('✅ DB loaded from file, users:', Object.keys(saved.users || {}).length);
      return saved;
    }
  } catch (e) { console.error('DB load error:', e.message); }
  return null;
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB), 'utf8');
  } catch (e) { console.error('DB save error:', e.message); }
}

const _saved = loadDB();

const DB = {
  repairMode:    _saved?.repairMode    || false,
  users:         _saved?.users         || {},
  promos:        _saved?.promos        || {},
  draws:         _saved?.draws         || {},
  finished:      _saved?.finished      || {},
  drawCounter:   _saved?.drawCounter   || 0,
  pendingDraw:   _saved?.pendingDraw   || {},
  starsInvoices: _saved?.starsInvoices || {},
  invoiceCounter:_saved?.invoiceCounter|| 0,
  bans:          _saved?.bans          || {},
  bansByUid:     _saved?.bansByUid     || {},
  bigWins:       _saved?.bigWins       || [], // {uid, firstName, photoUrl, amount, game, ts}
  globalEarned:  _saved?.globalEarned  || 0,  // сумма чистых выигрышей всех игроков
  notifyOpen:    _saved?.notifyOpen    ?? true, // уведомления о входе в приложение
  notifications: _saved?.notifications || [], // push уведомления от админа
  customTasks:      _saved?.customTasks      || [], // задания, созданные админом через /ctask
  customTaskCounter:_saved?.customTaskCounter|| 0,
  caseOpens:        _saved?.caseOpens        || {}, // счётчик открытий по каждому кейсу {caseId: N}
  taskOverrides:    _saved?.taskOverrides    || {}, // overrides for static tasks {id: {rew, name, desc, tag, tc, order}}
  shopItemOverrides:_saved?.shopItemOverrides|| {}, // overrides for static ITEMS {id: {name, price, tag, tagColor, borderColor}}
  accessControl:    _saved?.accessControl    || { enabled: false, whitelist: [] }, // whitelist access control
};

// Init task counter from existing tasks if not set
if (!DB.customTaskCounter) DB.customTaskCounter = 1000 + (DB.customTasks || []).length;

// Автосохранение каждые 30 секунд
setInterval(saveDB, 30000);

// GitHub backup каждые 10 минут
setInterval(() => backupDBToGitHub(), 10 * 60 * 1000);

// Сохранение при завершении процесса + GitHub backup
process.on('SIGTERM', async () => {
  saveDB();
  try { await backupDBToGitHub(); } catch {}
  process.exit(0);
});
process.on('SIGINT', async () => {
  saveDB();
  try { await backupDBToGitHub(); } catch {}
  process.exit(0);
});


/* ══ TRANSACTIONS ══ */
function addTx(uid, type, amount, details) {
  const u = getUser(uid);
  if (!u.transactions) u.transactions = [];
  u.transactions.unshift({
    type, amount, details,
    date: mskFmt(null, {day:'numeric',month:'short',year:'numeric'})
  });
  // Keep last 100
  if (u.transactions.length > 100) u.transactions = u.transactions.slice(0, 100);
}

/* Moscow timezone helper (UTC+3) */
function mskDate(ts) {
  const d = ts ? new Date(ts) : new Date();
  return new Date(d.getTime() + 3 * 60 * 60 * 1000);
}
function mskFmt(ts, opts) {
  return mskDate(ts).toLocaleDateString('ru-RU', opts);
}
function mskTimeFmt(ts) {
  return mskDate(ts).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
}

function getUser(uid) {
  uid = String(uid);
  if (!DB.users[uid]) DB.users[uid] = {
    balance: 1000, starsBalance: 0, refs: [], refBy: null, refEarned: 0,
    usedPromos: [], vipExpiry: null, username: '', firstName: '',
    regDate: mskFmt(null, {day:'numeric',month:'long',year:'numeric'})
  };
  // Убедимся что starsBalance существует у старых юзеров
  if (DB.users[uid].starsBalance === undefined) DB.users[uid].starsBalance = 0;
  return DB.users[uid];
}

function isAdmin(uid) { return Number(uid) === ADMIN_ID; }
function isMoney(prize) { return /^\d+$/.test(String(prize).trim()); }

/* ══ HELPERS ══ */

// Найти uid по username
function findUidByUsername(username) {
  username = username.replace(/^@/, '').toLowerCase();
  return Object.keys(DB.users).find(uid => (DB.users[uid].username||'').toLowerCase() === username) || null;
}

// Сбросить статистику пользователя (кроме starsBalance)
function resetUserStats(uid) {
  uid = String(uid);
  const u = DB.users[uid];
  if (!u) return false;
  const stars = u.starsBalance || 0;
  DB.users[uid] = {
    balance: 0,
    starsBalance: stars,
    refs: [],
    refBy: null,
    refEarned: 0,
    pendingReward: 0,
    usedPromos: [],
    vipExpiry: null,
    username: u.username || '',
    firstName: u.firstName || '',
    regDate: u.regDate || '',
    hasCrown: false,
    legendExpiry: null,
    legendColor: '#2ecc71',
    inventory: {},
    bonusMulti: 0,
    vipDiscount: false,
    doneTasks: [],
    task3Done: false,
    task5Done: false,
    task3refsDone: false,
    task5refsDone: false,
    resetAt: Date.now(),
  };
  return true;
}

// Проверить забанен ли пользователь
function isBanned(uid, username) {
  const now = Date.now();
  const banUid = DB.bansByUid[String(uid)];
  if (banUid) {
    if (banUid.until === 0 || banUid.until > now) return banUid;
    else delete DB.bansByUid[String(uid)];
  }
  if (username) {
    const un = username.replace(/^@/, '').toLowerCase();
    const banUn = DB.bans[un];
    if (banUn) {
      if (banUn.until === 0 || banUn.until > now) return banUn;
      else delete DB.bans[un];
    }
  }
  return null;
}

// Парсинг времени бана: "1 час", "7 дней", "0" = навсегда
function parseBanDuration(str) {
  if (!str || str === '0') return 0;
  str = str.toLowerCase().trim();
  const map = {
    'мин':60,'минут':60,'минута':60,'минуты':60,'min':60,
    'час':3600,'часа':3600,'часов':3600,'hour':3600,'h':3600,
    'день':86400,'дня':86400,'дней':86400,'day':86400,'d':86400,
    'неделя':604800,'недели':604800,'недель':604800,'week':604800,'w':604800,
    'год':31536000,'года':31536000,'лет':31536000,'year':31536000,'y':31536000,
  };
  const match = str.match(/^(\d+)\s*(.+)$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].trim();
  const sec = map[unit];
  if (!sec) return null;
  return Date.now() + num * sec * 1000;
}

function formatDuration(ms) {
  if (ms <= 0 || ms === 0) return 'навсегда';
  const diff = ms - Date.now();
  if (diff <= 0) return 'истёк';
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + ' сек.';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' мин.';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ч.';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' дн.';
  return Math.floor(d / 30) + ' мес.';
}

async function getPhotoUrl(fileId) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const d = await r.json();
    if (d.ok) return `https://api.telegram.org/file/bot${BOT_TOKEN}/${d.result.file_path}`;
  } catch {}
  return null;
}

async function checkSub(userId, channel) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`);
    const d = await r.json();
    if (!d.ok) return false;
    return ['member','administrator','creator'].includes(d.result?.status);
  } catch { return false; }
}

async function checkMember(userId, channel) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`);
    const d = await r.json();
    if (!d.ok) return false;
    const s = d.result?.status;
    return s && s !== 'left' && s !== 'kicked';
  } catch { return false; }
}

/* ══ ЗАВЕРШЕНИЕ РОЗЫГРЫША ══ */
async function finishDraw(id) {
  const draw = DB.draws[id];
  if (!draw || draw.finished) return;
  draw.finished = true;
  draw.finishedAt = Date.now();

  if (!draw.participants.length) {
    DB.finished[id] = { ...draw, winners: [] };
    delete DB.draws[id];
    try { await bot.telegram.sendMessage(ADMIN_ID, `🎁 Розыгрыш #${id} (${draw.prize}) завершён — участников не было.`); } catch {}
    return;
  }

  const count = Math.min(draw.winnersCount || 1, draw.participants.length);
  const shuffled = [...draw.participants].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, count);
  const moneyPrize = isMoney(draw.prize);
  const amountEach = moneyPrize ? Math.floor(parseInt(draw.prize) / count) : 0;

  draw.winners = winners;
  DB.finished[id] = { ...draw };
  delete DB.draws[id];
  saveDB();

  // Уведомление админу
  const winList = winners.map(w => `${w.name} (ID: ${w.uid})`).join('\n');
  const pList = draw.participants.map(p => p.name).join(', ');
  try {
    await bot.telegram.sendMessage(ADMIN_ID,
      `🎉 Розыгрыш #${id} завершён!\n` +
      `🏆 Приз: ${draw.prize}${moneyPrize ? ' монет' : ''}\n` +
      `👑 Победител${count > 1 ? 'и' : 'ь'}:\n${winList}\n\n` +
      `👥 Участники: ${pList}`
    );
  } catch {}

  // Уведомляем победителей
  for (const winner of winners) {
    if (moneyPrize) {
      const u = getUser(winner.uid);
      // serverBalance — авторитативный баланс, применится при sync и не перезаписывается клиентом
      u.serverBalance = (u.serverBalance !== undefined ? u.serverBalance : (u.balance || 0)) + amountEach;
      try {
        await bot.telegram.sendMessage(Number(winner.uid),
          `🎉 Ты победил в розыгрыше!\n🏆 Приз: ${amountEach} монет\n\n💰 Открой приложение — монеты уже на балансе!`
        );
      } catch {}
    } else {
      try {
        await bot.telegram.sendMessage(Number(winner.uid),
          `🎉 Ты победил в розыгрыше!\n🏆 Приз: ${draw.prize}\n\nАдминистратор скоро свяжется!`
        );
      } catch {}
    }
  }
}

/* ══ REST API ══ */

// POST /api/ref/register — регистрация реферала через WebApp
app.post('/api/ref/register', async (req, res) => {
  const { userId, refUID, username, firstName } = req.body;
  if (!userId || !refUID) return res.status(400).json({ ok: false });
  if (String(userId) === String(refUID)) return res.json({ ok: false, reason: 'self' });

  const u = getUser(userId);
  const ru = getUser(refUID);

  // Уже зарегистрирован реферал
  if (u.refBy) return res.json({ ok: false, reason: 'already' });

  u.refBy = String(refUID);
  if (username) u.username = username.toLowerCase();
  if (firstName) u.firstName = firstName;

  const name = username ? '@'+username : (firstName || 'Пользователь');
  const today = new Date().toLocaleDateString('ru');
  if (!ru.refs) ru.refs = [];
  // Получаем фото нового пользователя
  let newUserPhoto = null;
  try {
    const photos = await bot.telegram.getUserProfilePhotos(userId, { limit: 1 });
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await bot.telegram.getFile(fileId);
      newUserPhoto = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    }
  } catch {}

  ru.refs.push({ uid: String(userId), name, date: today, photoUrl: newUserPhoto });
  ru.refEarned = (ru.refEarned || 0) + 1000;
  // Начисляем через pendingReward — сервер добавит при следующем sync
  ru.pendingReward = (ru.pendingReward || 0) + 1000;

  let bonusMsg = null;

  // Бонус за 3 реферала
  if (ru.refs.length >= 3 && !ru.task3Done) {
    ru.pendingReward += 2000;
    ru.task3Done = true;
    bonusMsg = `🎉 Бонус! 3 реферала — +2000 монет! Открой приложение чтобы увидеть обновлённый баланс.`;
  }

  // Бонус за 5 новых рефералов после task3
  const refsAfterTask3 = Math.max(0, ru.refs.length - 3);
  if (refsAfterTask3 >= 5 && !ru.task5Done) {
    ru.pendingReward += 5000;
    ru.task5Done = true;
    bonusMsg = `🎉 Мега-бонус! 5 новых рефералов — +5000 монет! Открой приложение чтобы увидеть обновлённый баланс.`;
  }

  if (bonusMsg) {
    try { await bot.telegram.sendMessage(refUID, bonusMsg); } catch {}
  } else {
    try { await bot.telegram.sendMessage(refUID, `🎉 По твоей ссылке зашёл ${name}!\n💰 +1000 монет — открой приложение чтобы получить!`); } catch {}
  }

  saveDB();
  res.json({ ok: true });
});

app.post('/api/user/sync', (req, res) => {
  const { userId, username, firstName, balance, starsBalance, vipExpiry, photoUrl, localRefs, localRefEarned, localTask3Done, localTask5Done } = req.body;
  if (!userId) return res.json({ ok: false });
  const u = getUser(userId);
  if (username) u.username = username.toLowerCase();
  if (firstName) u.firstName = firstName;
  if (photoUrl) u.photoUrl = photoUrl;
  u.lastSeen = Date.now();

  // Если забанен по username — применяем бан к uid
  if (username) {
    const un = username.replace(/^@/, '').toLowerCase();
    if (DB.bans[un] && !DB.bansByUid[String(userId)]) {
      DB.bansByUid[String(userId)] = DB.bans[un];
    }
  }

  // Проверяем бан
  const ban = isBanned(userId, username);
  if (ban) {
    return res.json({ ok: true, banned: true, banUntil: ban.until, balance: u.balance, starsBalance: u.starsBalance });
  }

  // Если был сброс — говорим клиенту очистить localStorage (не для администратора)
  const wasReset = u.resetAt ? u.resetAt : null;
  if (wasReset) {
    delete u.resetAt;
    saveDB();
    if (!isAdmin(userId)) {
      return res.json({ ok: true, reset: true, resetAt: wasReset, balance: u.balance, starsBalance: u.starsBalance });
    }
  }

  // If server has authoritative balance (set by /pgive), use it and clear flag
  if (u.serverBalance !== undefined) {
    u.balance = u.serverBalance;
    delete u.serverBalance;
  } else if (balance !== undefined && Number(balance) >= 0) {
    // Client is source of truth normally
    u.balance = Number(balance);
  }
  // Применяем накопленные серверные награды (рефералы, бонусы)
  if (u.pendingReward && u.pendingReward > 0) {
    u.balance = (u.balance || 0) + u.pendingReward;
    u.pendingReward = 0;
  }
  if (starsBalance !== undefined && Number(starsBalance) >= 0) {
    u.starsBalance = Number(starsBalance);
  }
  // Sync vipExpiry from client
  if (vipExpiry !== undefined) {
    const vipNum = vipExpiry ? Number(vipExpiry) : null;
    u.vipExpiry = (vipNum && vipNum > Date.now()) ? vipNum : null;
  }

  // ── Уведомление админа о входе ──────────────────────────────
  if (DB.notifyOpen) {
    const now = Date.now();
    const isNew = !u.createdAt || (now - u.createdAt < 5000);
    const vip = u.vipExpiry && u.vipExpiry > now ? ' ⭐ VIP' : '';
    const name = u.firstName || 'Неизвестный';
    const un = u.username ? `@${u.username}` : `ID: ${userId}`;
    const emoji = isNew ? '🆕' : '👤';
    const label = isNew ? 'Новый пользователь' : 'Вошёл в приложение';
    setImmediate(async () => {
      try {
        await bot.telegram.sendMessage(ADMIN_ID,
          `${emoji} *${label}*
${name} ${un}${vip}
💰 ${u.balance || 0} монет · ⭐ ${u.starsBalance || 0} Stars`,
          { parse_mode: 'Markdown' }
        );
      } catch {}
    });
  }

  // Если сервер потерял рефов (редеплой/dstats-восстановление), восстанавливаем из клиента
  if ((!u.refs || u.refs.length === 0) && localRefs && localRefs.length > 0) {
    u.refs = localRefs;
    // Восстанавливаем заработок: 1000 за каждого + бонусы за задания
    const refCount = localRefs.length;
    u.refEarned = refCount * 1000;
    // Автоматически проставляем флаги и добавляем бонусы к refEarned
    if (refCount >= 3 && !u.task3Done) {
      u.task3Done = true;
      u.refEarned += 2000;
    }
    if (refCount >= 8 && !u.task5Done) { // 3 + 5
      u.task5Done = true;
      u.refEarned += 5000;
    }
  }
  // Даже если рефы есть — синхронизируем флаги заданий из клиента если сервер их потерял
  if (localTask3Done && !u.task3Done) u.task3Done = true;
  if (localTask5Done && !u.task5Done) u.task5Done = true;

  saveDB();
  res.json({ ok: true, balance: u.balance, starsBalance: u.starsBalance, refs: u.refs, refEarned: u.refEarned, vipExpiry: u.vipExpiry, task3Done: u.task3Done||false, task5Done: u.task5Done||false });
});

// Получение и кеширование аватарки пользователя через Bot API
app.get('/api/user/photo/:userId', async (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.json({ ok: false });

  const u = getUser(userId);
  // Если уже есть в кеше и свежая (< 24ч) — отдаём сразу
  if (u.photoUrl && u.photoFetchedAt && (Date.now() - u.photoFetchedAt < 24 * 3600 * 1000)) {
    return res.json({ ok: true, photoUrl: u.photoUrl });
  }

  try {
    // Шаг 1: получаем список фото профиля
    const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`);
    const photosData = await photosRes.json();

    if (!photosData.ok || !photosData.result?.total_count) {
      return res.json({ ok: true, photoUrl: null });
    }

    // Берём самый большой вариант первой фотки
    const photos = photosData.result.photos[0];
    const fileId = photos[photos.length - 1].file_id;

    // Шаг 2: получаем путь файла
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) return res.json({ ok: true, photoUrl: null });

    const photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;

    // Кешируем в базе
    u.photoUrl = photoUrl;
    u.photoFetchedAt = Date.now();
    saveDB();

    res.json({ ok: true, photoUrl });
  } catch (e) {
    res.json({ ok: true, photoUrl: u.photoUrl || null });
  }
});

// Проверка бана (вызывается из приложения при каждом открытии)
app.get('/api/user/ban-status', (req, res) => {
  const { userId, username } = req.query;
  if (!userId) return res.json({ ok: false });
  const ban = isBanned(userId, username);
  if (!ban) return res.json({ ok: true, banned: false });
  return res.json({ ok: true, banned: true, banUntil: ban.until });
});

app.post('/api/balance/update', (req, res) => {
  const { userId, balance, starsBalance } = req.body;
  if (!userId || balance === undefined) return res.json({ ok: false });
  const u = getUser(userId);
  u.balance = Number(balance);
  if (starsBalance !== undefined) u.starsBalance = Number(starsBalance);
  saveDB();
  res.json({ ok: true, balance: u.balance, starsBalance: u.starsBalance });
});

app.post('/api/check-sub', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok: false, error: 'missing params' });
  const subscribed = await checkSub(userId, channel);
  res.json({ ok: true, subscribed });
});

app.post('/api/check-chat', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok: false, error: 'missing params' });
  const member = await checkMember(userId, channel);
  res.json({ ok: true, member });
});

/* ── Public custom shop items ── */
app.get('/api/shop/custom', (req, res) => {
  res.json(DB.customShopItems || []);
});

app.post('/api/promo', (req, res) => {
  const { code, userId, isVip } = req.body;
  const c = (code||'').toUpperCase().trim();
  if (!c || !userId) return res.json({ ok: false, error: '❌ Неверный запрос' });
  const p = DB.promos[c];
  if (!p) return res.json({ ok: false, error: '❌ Неверный промокод' });
  if (p.vipOnly && !isVip) return res.json({ ok: false, error: '❌ Промокод только для VIP' });
  if (p.usedCount >= p.maxUses) return res.json({ ok: false, error: '❌ Промокод больше недоступен' });
  const u = getUser(userId);
  if (u.usedPromos.includes(c)) return res.json({ ok: false, error: '❌ Вы уже использовали этот промокод' });
  u.usedPromos.push(c);
  u.balance += p.reward;
  p.usedCount++;
  if (p.usedCount >= p.maxUses && !p.soldOutAt) p.soldOutAt = Date.now();
  addTx(userId, 'promo_code', '+'+p.reward, 'Промокод ' + c);
  saveDB();
  res.json({ ok: true, reward: p.reward, balance: u.balance });
});

/* ══ STARS PAYMENT API ══ */

/**
 * POST /api/stars/create-invoice
 * Создаёт инвойс Telegram Stars для оплаты
 * Body: { userId, amount }
 * Response: { ok, invoiceId, invoiceLink }
 */
app.post('/api/stars/create-invoice', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || Number(amount) < 1) {
    return res.json({ ok: false, error: 'Неверные параметры' });
  }
  const stars = Math.floor(Number(amount));
  if (stars > 99999) return res.json({ ok: false, error: 'Максимум 99 999 Stars за раз' });

  try {
    // Создаём invoice через Telegram Bot API
    // createInvoiceLink — доступен через sendInvoice или через прямой вызов API
    const apiRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '⭐ Пополнение Stars',
        description: `Зачисление ${stars} Stars на баланс SatApp Gifts`,
        payload: JSON.stringify({ userId: String(userId), amount: stars }),
        currency: 'XTR',              // XTR = Telegram Stars
        prices: [{ label: 'Stars', amount: stars }],
      })
    });
    const apiData = await apiRes.json();

    if (!apiData.ok) {
      console.error('createInvoiceLink error:', apiData);
      return res.json({ ok: false, error: 'Ошибка создания счёта Telegram' });
    }

    const invoiceId = 'inv_' + (++DB.invoiceCounter) + '_' + Date.now();
    DB.starsInvoices[invoiceId] = {
      userId: String(userId),
      amount: stars,
      paid: false,
      createdAt: Date.now(),
      invoiceLink: apiData.result,
    };

    res.json({ ok: true, invoiceId, invoiceLink: apiData.result });
  } catch (e) {
    console.error('Stars invoice error:', e);
    res.json({ ok: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/stars/check
 * Проверяет был ли оплачен инвойс и зачисляет Stars
 * Body: { userId, invoiceId, amount }
 * Response: { ok, credited, starsBalance, amount } или { ok, pending }
 */
app.post('/api/stars/check', (req, res) => {
  const { userId, invoiceId, amount } = req.body;
  if (!userId) return res.json({ ok: false, error: 'Не авторизован' });

  // Если invoiceId передан — проверяем конкретный инвойс
  if (invoiceId) {
    const inv = DB.starsInvoices[invoiceId];
    if (!inv) return res.json({ ok: false, error: 'Счёт не найден' });
    if (String(inv.userId) !== String(userId)) return res.json({ ok: false, error: 'Доступ запрещён' });

    if (inv.paid) {
      // Уже зачислено ранее
      const u = getUser(userId);
      return res.json({ ok: true, credited: true, starsBalance: u.starsBalance, amount: inv.amount });
    }

    // Проверяем — оплачен ли (флаг устанавливается в pre_checkout + successful_payment)
    return res.json({ ok: true, pending: true });
  }

  // Fallback: без invoiceId — не должно использоваться
  return res.json({ ok: false, error: 'invoiceId обязателен' });
});

/* ══ Обработка успешной оплаты Stars ══ */
bot.command('notify', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  DB.notifyOpen = !DB.notifyOpen;
  saveDB();
  await ctx.reply(DB.notifyOpen
    ? '🔔 Уведомления о входе в приложение ВКЛЮЧЕНЫ'
    : '🔕 Уведомления о входе в приложение ОТКЛЮЧЕНЫ'
  );
});

bot.on('pre_checkout_query', async (ctx) => {
  // Всегда отвечаем OK — Telegram требует ответ в течение 10 секунд
  try { await ctx.answerPreCheckoutQuery(true); } catch (e) { console.error('pre_checkout error:', e); }
});

bot.on('message', async (ctx, next) => {
  // Обработка successful_payment (оплата Stars)
  if (ctx.message?.successful_payment) {
    const payment = ctx.message.successful_payment;
    // payload — JSON строка { userId, amount }
    try {
      const payload = JSON.parse(payment.invoice_payload);
      const userId = String(payload.userId);
      const stars = Number(payload.amount);
      const u = getUser(userId);
      u.starsBalance = (u.starsBalance || 0) + stars;
      addTx(userId, 'stars_buy', '+'+stars, 'Пополнение Stars');

      // Помечаем инвойс как оплаченный
      for (const inv of Object.values(DB.starsInvoices)) {
        if (String(inv.userId) === userId && inv.amount === stars && !inv.paid) {
          const age = Date.now() - inv.createdAt;
          if (age < 3600000) { // не старше 1 часа
            inv.paid = true;
            break;
          }
        }
      }

      try {
        await ctx.reply(
          `⭐ Оплата прошла успешно!\n\n` +
          `Зачислено: ${stars} Stars\n` +
          `Ваш баланс Stars: ${u.starsBalance} ⭐\n\n` +
          `Баланс обновится в приложении автоматически.`
        );
      } catch {}

      try {
        await bot.telegram.sendMessage(ADMIN_ID,
          `⭐ Stars оплата!\nПользователь: @${u.username || userId} (${userId})\nСумма: ${stars} Stars\nНовый баланс Stars: ${u.starsBalance}`
        );
      } catch {}
    } catch (e) {
      console.error('Stars payment parse error:', e);
    }
    return;
  }

  // Обновляем данные пользователя при любом сообщении
  const u = getUser(ctx.from.id);
  u.username = (ctx.from.username||'').toLowerCase();
  u.firstName = ctx.from.first_name||'';
  return next();
});

app.get('/api/draws', (req, res) => {
  const now = Date.now();
  const active = Object.values(DB.draws)
    .filter(d => !d.finished && d.endsAt > now)
    .map(d => ({
      id: d.id, prize: d.prize, endsAt: d.endsAt,
      imageUrl: d.imageUrl, participantsCount: d.participants.length,
      winnersCount: d.winnersCount || 1, isMoney: isMoney(d.prize),
      requireTicket: d.requireTicket || false,
      conditions: d.conditions || [],
      description: d.description || ''
    }));
  res.json({ ok: true, draws: active });
});

app.get('/api/draws/finished', (req, res) => {
  const list = Object.values(DB.finished)
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .map(d => ({
      id: d.id, prize: d.prize, imageUrl: d.imageUrl,
      isMoney: isMoney(d.prize),
      participants: d.participants,
      winners: d.winners || [],
      finishedAt: d.finishedAt,
      winnersCount: d.winnersCount || 1,
    }));
  res.json({ ok: true, draws: list });
});

app.post('/api/draws/join', (req, res) => {
  const { drawId, userId, username, firstName, useTicket } = req.body;
  const draw = DB.draws[drawId];
  if (!draw || draw.finished || draw.endsAt < Date.now()) return res.json({ ok: false, error: 'Розыгрыш не найден или завершён' });
  if (draw.participants.find(p => String(p.uid) === String(userId))) return res.json({ ok: false, error: 'Вы уже участвуете' });

  // Проверка билета
  if (draw.requireTicket) {
    const u = getUser(userId);
    const tickets = u.tickets || 0;
    if (tickets < 1) return res.json({ ok: false, error: 'ticket_required', errorText: '🎟 Нужен билет для участия' });
    if (useTicket) {
      u.tickets = tickets - 1;
    } else {
      return res.json({ ok: false, error: 'ticket_confirm', tickets, errorText: `🎟 Этот розыгрыш требует билет. У вас ${tickets} шт.` });
    }
  }

  draw.participants.push({ uid: String(userId), name: username ? '@'+username : (firstName||'Аноним') });
  saveDB();
  res.json({ ok: true, count: draw.participants.length });
});

app.post('/api/draws/check-tg-subs', async (req, res) => {
  const { drawId, userId } = req.body;
  if (!drawId || !userId) return res.json({ ok: false, error: 'missing params' });
  const draw = DB.draws[drawId];
  if (!draw) return res.json({ ok: false, error: 'Розыгрыш не найден' });
  const tgConds = (draw.conditions || []).filter(c => c.type === 'tg');
  if (!tgConds.length) return res.json({ ok: true, status: [] });
  const status = [];
  for (const c of tgConds) {
    const ch = c.channel || '';
    const subscribed = await checkSub(userId, ch);
    status.push(subscribed);
  }
  res.json({ ok: true, status });
});



/* ══════════════════════════════════════════════
   SPORTS BETTING — API-Football
══════════════════════════════════════════════ */

// ── football-data.org ──────────────────────────────────────────────────────
const FD_KEY  = process.env.FOOTBALL_API_KEY || 'd31c90d3d5d746aea13921a68d2defc2';
const FD_BASE = 'https://api.football-data.org/v4';
const _sportsCache = { live: null, liveTs: 0 };

// Competitions available on free tier
const FD_COMPETITIONS = [
  2001, // UEFA Champions League
  2021, // Premier League
  2014, // La Liga
  2002, // Bundesliga
  2019, // Serie A
  2015, // Ligue 1
  2003, // Eredivisie
  2017, // Primeira Liga
  2000, // FIFA World Cup
  2018, // European Championship
];

function fdFetch(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(FD_BASE + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'X-Auth-Token': FD_KEY }
    };
    const req = https.request(opts, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          const parsed = JSON.parse(data);
          console.log('fdFetch', path.split('?')[0], '-> status', res.statusCode, 'count:', parsed.resultSet?.count || parsed.count || 0);
          resolve({ _status: res.statusCode, ...parsed });
        } catch(e) {
          console.error('fdFetch parse error:', e.message);
          reject(e);
        }
      });
    });
    req.on('error', function(e) {
      console.error('fdFetch request error:', e.message);
      reject(e);
    });
    req.end();
  });
}

// Convert football-data.org match -> api-football fixture format (bets.js expects this)
function fdToFixture(m) {
  const statusMap = {
    'IN_PLAY':   '1H',
    'PAUSED':    'HT',
    'FINISHED':  'FT',
    'SCHEDULED': 'NS',
    'TIMED':     'NS',
    'POSTPONED': 'PST',
    'CANCELLED': 'CANC',
    'SUSPENDED': 'SUSP',
  };
  const short = statusMap[m.status] || m.status || 'NS';
  const live = ['IN_PLAY','PAUSED'].includes(m.status);
  const gh = live || m.status === 'FINISHED' ? (m.score?.fullTime?.home ?? null) : null;
  const ga = live || m.status === 'FINISHED' ? (m.score?.fullTime?.away ?? null) : null;
  // elapsed: football-data doesn't give minute directly in free tier, estimate from utcDate
  let elapsed = null;
  if (m.status === 'IN_PLAY') {
    const kickoff = new Date(m.utcDate).getTime();
    const mins = Math.floor((Date.now() - kickoff) / 60000);
    elapsed = Math.min(90, Math.max(1, mins));
  } else if (m.status === 'PAUSED') {
    elapsed = 45;
  }
  return {
    fixture: {
      id: m.id,
      date: m.utcDate,
      status: { short, elapsed }
    },
    league: {
      id: m.competition?.id || 0,
      name: m.competition?.name || 'Лига',
    },
    teams: {
      home: { name: m.homeTeam?.shortName || m.homeTeam?.name || '?', logo: '' },
      away: { name: m.awayTeam?.shortName || m.awayTeam?.name || '?', logo: '' }
    },
    goals: { home: gh, away: ga },
    score: {
      halftime: { home: m.score?.halfTime?.home ?? null, away: m.score?.halfTime?.away ?? null },
      fulltime:  { home: m.score?.fullTime?.home ?? null, away: m.score?.fullTime?.away ?? null }
    }
  };
}

// Single /matches request — one call, all competitions
async function fdFetchAll(params) {
  const d = await fdFetch('/matches?' + params);
  return d.matches || [];
}

app.get('/api/sports/live', async function(req, res) {
  try {
    const now = Date.now();
    // Short cache 20s for live
    if (_sportsCache.live && now - _sportsCache.liveTs < 20000) {
      return res.json({ fixtures: _sportsCache.live });
    }
    // IN_PLAY = actively playing, PAUSED = half-time break
    const matches = await fdFetchAll('status=IN_PLAY,PAUSED');
    // Extra guard: exclude any FINISHED matches that slipped through
    const live = matches.filter(function(m) {
      return m.status === 'IN_PLAY' || m.status === 'PAUSED';
    });
    const fixtures = live.map(fdToFixture);
    _sportsCache.live = fixtures;
    _sportsCache.liveTs = now;
    res.json({ fixtures });
  } catch(e) {
    console.error('sports/live error:', e.message);
    res.json({ fixtures: _sportsCache.live || [] });
  }
});

const TOP_LEAGUES = [2001, 2021, 2014, 2002, 2019, 2015, 2003, 2017, 2000, 2018];

app.get('/api/sports/today', async function(req, res) {
  try {
    const now = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);
    const cacheKey = 'today_' + todayKey;
    if (_sportsCache[cacheKey] && now - (_sportsCache[cacheKey+'_ts']||0) < 180000) {
      return res.json({ fixtures: _sportsCache[cacheKey] });
    }
    // dateFrom = today, dateTo = tomorrow — shows today's remaining + tomorrow's matches
    const d = new Date();
    const dateFrom = d.toISOString().slice(0, 10);
    const d2 = new Date(d.getTime() + 86400000);
    const dateTo = d2.toISOString().slice(0, 10);
    // No status filter — get SCHEDULED and TIMED both (API may return either)
    const matches = await fdFetchAll('dateFrom=' + dateFrom + '&dateTo=' + dateTo);
    // Keep only upcoming (not finished, not live)
    const upcoming = matches.filter(function(m) {
      return m.status === 'SCHEDULED' || m.status === 'TIMED';
    });
    let fixtures = upcoming.map(fdToFixture);
    // Sort: top leagues first, then by kickoff time
    fixtures.sort(function(a, b) {
      const ai = TOP_LEAGUES.indexOf(a.league.id);
      const bi = TOP_LEAGUES.indexOf(b.league.id);
      if (ai !== -1 && bi === -1) return -1;
      if (ai === -1 && bi !== -1) return 1;
      if (ai !== -1 && bi !== -1) return ai - bi;
      // same priority → sort by time
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });
    fixtures = fixtures.slice(0, 80);
    _sportsCache[cacheKey] = fixtures;
    _sportsCache[cacheKey+'_ts'] = now;
    res.json({ fixtures });
  } catch(e) {
    console.error('sports/today error:', e.message);
    res.json({ fixtures: [] });
  }
});

app.get('/api/sports/debug', async function(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const d2 = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const d = await fdFetch('/matches?dateFrom=' + today + '&dateTo=' + d2);
    const total = (d.matches || []).length;
    const byStatus = {};
    (d.matches || []).forEach(function(m) { byStatus[m.status] = (byStatus[m.status]||0)+1; });
    res.json({ ok: !d.errorCode, status: d._status, total, byStatus });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});



// GET /api/notifications — fetch notifications (supports ?lastId= for efficient polling)
app.get('/api/notifications', function(req, res) {
  const all = (DB.notifications || []).slice(0, 100);
  const lastId = Number(req.query.lastId) || 0;
  const notifs = lastId ? all.filter(n => n.id > lastId) : all.slice(0, 50);
  res.json({ notifications: notifs });
});

// DELETE /api/notifications/:id — delete single notification (admin only, unused from frontend)
app.delete('/api/notifications/:id', function(req, res) {
  const id = Number(req.params.id);
  if (!DB.notifications) return res.json({ ok: false });
  const before = DB.notifications.length;
  DB.notifications = DB.notifications.filter(n => n.id !== id);
  if (DB.notifications.length < before) { saveDB(); return res.json({ ok: true }); }
  res.json({ ok: false, error: 'not found' });
});

app.post('/api/bets/place', function(req, res) {
  const uid      = String(req.body.uid || '').trim();
  const matchName= String(req.body.matchName || '').slice(0, 120);
  const pick     = String(req.body.pick || '').slice(0, 40);
  const currency = ['coins','stars'].includes(req.body.currency) ? req.body.currency : 'coins';
  const matchId  = parseInt(req.body.matchId) || 0;

  // Strictly parse and clamp odds (1.01–20) — prevents odds manipulation
  const odds = parseFloat(req.body.odds);
  if (!isFinite(odds) || odds < 1.01 || odds > 20)
    return res.json({ ok: false, error: 'Неверный коэффициент' });

  // Strictly parse and clamp amount — prevents float/overflow exploits
  const amount = Math.floor(Number(req.body.amount));
  const maxBet  = currency === 'stars' ? 10000 : 10000000;
  const min     = currency === 'stars' ? 50 : 1000;
  if (!isFinite(amount) || amount < min || amount > maxBet)
    return res.json({ ok: false, error: `Сумма ставки: ${min}–${maxBet.toLocaleString('ru')}` });

  // Validate required fields
  if (!uid || !matchName || !pick)
    return res.json({ ok: false, error: 'Неверные данные' });

  // Validate pick value
  const validPicks = ['П1', 'П2', 'Ничья'];
  if (!validPicks.some(p => pick.startsWith(p)))
    return res.json({ ok: false, error: 'Неверный исход' });

  const u = DB.users[uid];
  if (!u) return res.json({ ok: false, error: 'Пользователь не найден' });

  // Rate limit: max 10 pending bets at once
  const pending = (u.sportsBets || []).filter(b => b.status === 'pending').length;
  if (pending >= 10) return res.json({ ok: false, error: 'Макс. 10 активных ставок' });

  // Balance check and deduction (atomic)
  if (currency === 'stars') {
    const bal = Math.floor(u.starsBalance || 0);
    if (bal < amount) return res.json({ ok: false, error: 'Недостаточно звёзд' });
    u.starsBalance = bal - amount;
  } else {
    const bal = Math.floor(u.balance || 0);
    if (bal < amount) return res.json({ ok: false, error: 'Недостаточно монет' });
    u.balance = bal - amount;
  }

  if (!u.sportsBets) u.sportsBets = [];
  const bet = {
    id: Date.now(), matchId, matchName, pick,
    odds: parseFloat(odds.toFixed(2)),  // store rounded odds
    amount, currency,
    status: 'pending', winAmount: null, score: null, ts: Date.now()
  };
  u.sportsBets.unshift(bet);
  if (u.sportsBets.length > 100) u.sportsBets = u.sportsBets.slice(0, 100);
  saveDB();
  res.json({ ok: true, bet });
});

app.get('/api/bets/history', async function(req, res) {
  const uid = String(req.query.uid || '');
  const u = DB.users[uid];
  if (!u) return res.json({ bets: [] });
  if (!u.sportsBets || !u.sportsBets.length) return res.json({ bets: [] });

  // Settle pending bets on-request using fixture IDs
  const pending = u.sportsBets.filter(b => b.status === 'pending');
  if (pending.length) {
    try {
      // Moscow = UTC+3; check today and yesterday (UTC) to catch late-night matches
      const nowUtc = new Date();
      const toDate = d => d.toISOString().slice(0, 10);
      const yesterday = new Date(nowUtc.getTime() - 86400000);
      const dates = [toDate(nowUtc), toDate(yesterday)];
      const rawMatches = [];
      for (const date of dates) {
        try {
          const d = await fdFetch('/matches?dateFrom=' + date + '&dateTo=' + date + '&status=FINISHED&competitions=2001,2021,2014,2002,2019,2015,2003,2017,2000,2018');
          if (d.matches) d.matches.forEach(m => rawMatches.push(m));
        } catch(e) {}
      }
      const finished = rawMatches.map(fdToFixture);
      const byId = {};
      finished.forEach(f => { byId[f.fixture.id] = f; });

      pending.forEach(b => {
        // Match by matchId first, fallback to name
        let f = b.matchId ? byId[b.matchId] : null;
        if (!f) {
          f = finished.find(fi =>
            b.matchName && b.matchName.includes(fi.teams.home.name) &&
            b.matchName.includes(fi.teams.away.name)
          );
        }
        if (!f) return;

        const gh = f.goals.home, ga = f.goals.away;
        const winner = gh > ga ? 'h' : ga > gh ? 'a' : 'x';
        const isWin = (b.pick.startsWith('П1') && winner === 'h') ||
                      (b.pick === 'Ничья'       && winner === 'x') ||
                      (b.pick.startsWith('П2') && winner === 'a');
        b.status = isWin ? 'win' : 'lose';
        b.score = gh + ':' + ga;
        if (isWin) {
          const win = Math.round(b.amount * b.odds);
          b.winAmount = win;
          if (b.currency === 'stars') u.starsBalance = (u.starsBalance || 0) + win;
          else u.balance = (u.balance || 0) + win;
        }
      });
      saveDB(); // persist settled results immediately
    } catch(e) { console.error('settle on history:', e.message); }
  }

  res.json({ bets: u.sportsBets.slice().reverse().slice(0, 50), balance: u.balance, starsBalance: u.starsBalance });
});

setInterval(async function() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cronRaw = await fdFetch('/matches?dateFrom=' + today + '&dateTo=' + today + '&status=FINISHED&competitions=2001,2021,2014,2002,2019,2015,2003,2017,2000,2018');
    const rawFinished = cronRaw.matches || [];
    const finished = rawFinished.map(fdToFixture);
    if (!finished.length) return;
    const results = {};
    finished.forEach(function(f) {
      const h = f.goals && f.goals.home, a = f.goals && f.goals.away;
      const winner = h > a ? 'h' : a > h ? 'a' : 'x';
      results[f.fixture.id] = { winner: winner, home: f.teams.home.name, away: f.teams.away.name };
    });
    let settled = 0;
    Object.values(DB.users).forEach(function(u) {
      if (!u.sportsBets) return;
      u.sportsBets.filter(function(b) { return b.status === 'pending'; }).forEach(function(b) {
        const match = Object.values(results).find(function(r) {
          return b.matchName && b.matchName.includes(r.home) && b.matchName.includes(r.away);
        });
        if (!match) return;
        const isWin = (b.pick.startsWith('П1') && match.winner === 'h') ||
                      (b.pick === 'Ничья' && match.winner === 'x') ||
                      (b.pick.startsWith('П2') && match.winner === 'a');
        b.status = isWin ? 'win' : 'lose';
        if (isWin) {
          const win = Math.round(b.amount * b.odds);
          b.winAmount = win;
          if (b.currency === 'stars') u.starsBalance = (u.starsBalance || 0) + win;
          else u.balance = (u.balance || 0) + win;
        }
        settled++;
      });
    });
    if (settled > 0) { saveDB(); console.log('Settled ' + settled + ' bets'); }
  } catch(e) { console.error('bet settle error:', e.message); }
}, 5 * 60 * 1000);



/* ══ CUSTOM TASKS API ══ */
app.get('/api/tasks/custom', (req, res) => {
  res.json(DB.customTasks || []);
});

app.get('/api/repair-status', function(req, res) {
  res.json({ repairMode: DB.repairMode || false });
});

// Добавить чистый заработок (solo/mines/pvp/tasks)
app.post('/api/global-earned/add', (req, res) => {
  const { amount } = req.body;
  const n = parseInt(amount);
  if (!n || n <= 0) return res.json({ ok: false });
  if (!DB.globalEarned) DB.globalEarned = 0;
  DB.globalEarned += n;
  saveDB();
  res.json({ ok: true, globalEarned: DB.globalEarned });
});

app.get('/api/global-stats', (req, res) => {
  const users = Object.keys(DB.users).length;
  res.json({ ok: true, users, totalEarned: DB.globalEarned || 0 });
});

app.post('/api/case/open', (req, res) => {
  const { caseId, count } = req.body;
  if (!caseId) return res.json({ ok: false });
  if (!DB.caseOpens) DB.caseOpens = {};
  DB.caseOpens[caseId] = (DB.caseOpens[caseId] || 0) + (parseInt(count) || 1);
  saveDB();
  res.json({ ok: true, opens: DB.caseOpens[caseId] });
});

app.get('/api/case/stats', (req, res) => {
  res.json({ ok: true, caseOpens: DB.caseOpens || {} });
});

app.get('/api/health', (req, res) => res.json({ ok: true, users: Object.keys(DB.users).length }));

/* PvP online counters */
app.post('/api/ping', (req, res) => {
  const { userId, mode } = req.body;
  if (!userId) return res.json({ ok: false });
  const u = getUser(userId);
  u.lastSeen = Date.now();
  if (mode) u.lastMode = mode;
  res.json({ ok: true });
});

app.get('/api/pvp-online', (req, res) => {
  const now = Date.now();
  // Count users active in last 3 min AND actually IN a game (not just on menu)
  let duel = 0, solo = 0;
  for (const u of Object.values(DB.users)) {
    if (u.lastSeen && now - u.lastSeen < 3 * 60 * 1000) {
      if (u.lastMode === 'solo') solo++;
      else if (u.lastMode === 'duel') duel++;
      // 'menu' mode is excluded intentionally
    }
  }
  res.json({ duel, solo, total: duel + solo });
});

/* ══ BIG WINS API ══ */

// Record a big win (called from frontend)
app.post('/api/wins/record', async (req, res) => {
  const { userId, amount, game } = req.body;
  if (!userId || !amount || amount < 30000) return res.json({ ok: false });
  const u = getUser(String(userId));
  const now = Date.now();

  // Если нет фото или оно устарело — тихо подгружаем через Bot API
  if (!u.photoUrl || !u.photoFetchedAt || (now - u.photoFetchedAt > 24 * 3600 * 1000)) {
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`);
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result?.total_count > 0) {
        const photos = photosData.result.photos[0];
        const fileId = photos[photos.length - 1].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok) {
          u.photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          u.photoFetchedAt = now;
        }
      }
    } catch(e) {}
  }

  // Keep only last 500 entries, prune entries older than 48h
  DB.bigWins = DB.bigWins.filter(w => now - w.ts < 48 * 3600 * 1000).slice(-499);
  DB.bigWins.push({
    uid: String(userId),
    firstName: u.firstName || 'Игрок',
    photoUrl: u.photoUrl || null,
    amount: Number(amount),
    game: game || 'solo',
    ts: now
  });
  saveDB();
  res.json({ ok: true });
});

// Get top 3 wins in last 24h
app.get('/api/wins/top', (req, res) => {
  const since = Date.now() - 24 * 3600 * 1000;
  const recent = DB.bigWins.filter(w => w.ts >= since);
  // best single win per user
  const byUser = {};
  for (const w of recent) {
    if (!byUser[w.uid] || w.amount > byUser[w.uid].amount) byUser[w.uid] = w;
  }
  const top = Object.values(byUser)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map(w => {
      const u = DB.users?.[w.uid];
      return {
        firstName: w.firstName,
        photoUrl: u?.photoUrl || w.photoUrl || null,
        amount: w.amount,
        game: w.game
      };
    });
  res.json({ ok: true, wins: top });
});

/* ══ BOT COMMANDS ══ */

bot.start(async (ctx) => {
  const uid = String(ctx.from.id);
  const u = getUser(uid);
  u.username = (ctx.from.username||'').toLowerCase();
  u.firstName = ctx.from.first_name||'';
  const sp = ctx.startPayload;
  if (sp && sp.startsWith('ref_')) {
    const refUID = sp.replace('ref_','');
    if (refUID !== uid && !u.refBy) {
      const ru = getUser(refUID);
      u.refBy = refUID;
      const name = ctx.from.username ? '@'+ctx.from.username : ctx.from.first_name;
      // Получаем фото нового пользователя
      let newUserPhoto = null;
      try {
        const photos = await bot.telegram.getUserProfilePhotos(ctx.from.id, { limit: 1 });
        if (photos.total_count > 0) {
          const fileId = photos.photos[0][0].file_id;
          const file = await bot.telegram.getFile(fileId);
          newUserPhoto = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        }
      } catch {}
      ru.refs.push({ uid: String(ctx.from.id), name, date: mskFmt(null), photoUrl: newUserPhoto });
      ru.refEarned = (ru.refEarned || 0) + 1000;
      // Используем pendingReward — применится при следующем sync, не перезаписывается клиентом
      ru.pendingReward = (ru.pendingReward || 0) + 1000;
      let bonusMsg = null;
      if (ru.refs.length >= 3 && !ru.task3Done) {
        ru.pendingReward += 2000; ru.task3Done = true;
        bonusMsg = `🎉 Бонус! 3 реферала — +2000 монет! Открой приложение чтобы получить.`;
      }
      const refsAfterTask3start = Math.max(0, ru.refs.length - 3);
      if (refsAfterTask3start >= 5 && !ru.task5Done) {
        ru.pendingReward += 5000; ru.task5Done = true;
        bonusMsg = `🎉 Мега-бонус! 5 новых рефералов — +5000 монет! Открой приложение чтобы получить.`;
      }
      if (bonusMsg) {
        try { await ctx.telegram.sendMessage(refUID, bonusMsg); } catch {}
      } else {
        try { await ctx.telegram.sendMessage(refUID, `🎉 По твоей ссылке зашёл ${name}!\n💰 +1000 монет — открой приложение чтобы получить!`); } catch {}
      }
    }
  }
  await ctx.replyWithPhoto(
    { url: `${APP_URL}/img/welcome.jpg` },
    {
      caption: `👋 Привет, ${ctx.from.first_name}!\n\n🎁 Добро пожаловать в SatApp Gifts!\n💰 Баланс: ${u.balance} монет\n⭐ Stars: ${u.starsBalance}`,
      reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
    }
  );
});

bot.command('cpromo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const p = ctx.message.text.split(' ');
  if (p.length < 4) return ctx.reply('Формат: /cpromo КОД СУММА КОЛ-ВО\nПример: /cpromo SUMMER500 500 100');
  const c = p[1].toUpperCase();
  DB.promos[c] = { reward: Number(p[2]), maxUses: Number(p[3]), usedCount: 0, vipOnly: false };
  ctx.reply(`✅ Промокод создан!\n📌 Код: ${c}\n💰 Награда: ${p[2]} монет\n🔢 Активаций: ${p[3]}`);
});

bot.command('vpromo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const p = ctx.message.text.split(' ');
  if (p.length < 4) return ctx.reply('Формат: /vpromo КОД СУММА КОЛ-ВО');
  const c = p[1].toUpperCase();
  DB.promos[c] = { reward: Number(p[2]), maxUses: Number(p[3]), usedCount: 0, vipOnly: true };
  ctx.reply(`✅ VIP-промокод создан!\n📌 Код: ${c}\n💰 Награда: ${p[2]} монет\n👑 Только для VIP`);
});

/* ══ /ctask — создать задание ══ */
bot.command('ctask', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text.replace('/ctask', '').trim();
  if (!text) return ctx.reply(
    '📋 Формат: /ctask <тип> <монеты> <название> | <описание> [new]\n\n' +
    'Типы:\n' +
    '  sub:канал — подписка на канал\n' +
    '  chat:канал — написать в чат\n' +
    '  ref — пригласить друга\n' +
    '  case — открыть кейс\n' +
    '  wallet — подключить кошелёк\n\n' +
    'Примеры:\n' +
    '/ctask sub:mychannel 500 Подписаться на канал | Подпишись на @mychannel\n' +
    '/ctask ref 1000 Пригласи друга | Пригласи по реф-ссылке new'
  );

  const parts = text.split(' ');
  if (parts.length < 2) return ctx.reply('❌ Укажи тип и сумму монет');

  const typeRaw = parts[0].toLowerCase();
  const reward = parseInt(parts[1], 10);
  if (isNaN(reward) || reward <= 0) return ctx.reply('❌ Сумма монет должна быть числом > 0');

  const rest = parts.slice(2).join(' ');
  if (!rest.includes('|')) return ctx.reply('❌ Разделяй название и описание символом |');

  const [namePart, descPart] = rest.split('|').map(s => s.trim());
  const name = namePart;
  let desc = descPart;
  let isNew = false;

  if (desc.endsWith(' new') || desc === 'new') {
    isNew = true;
    desc = desc.replace(/ new$/, '').trim();
  }

  let check, channel, url, tag, tc;
  if (typeRaw.startsWith('sub:')) {
    channel = typeRaw.split(':')[1];
    check = 'sub'; tag = 'Канал'; tc = 'g';
    url = `https://t.me/${channel}`;
  } else if (typeRaw.startsWith('chat:')) {
    channel = typeRaw.split(':')[1];
    check = 'chat'; tag = 'Чат'; tc = 'g';
    url = `https://t.me/${channel}`;
  } else if (typeRaw === 'ref') {
    check = 'ref'; tag = 'Друзья'; tc = 'g';
  } else if (typeRaw === 'case') {
    check = 'case'; tag = 'Задание'; tc = 'g';
  } else if (typeRaw === 'wallet') {
    check = 'wallet'; tag = 'Кошелёк'; tc = 'g';
  } else {
    return ctx.reply('❌ Неизвестный тип. Используй: sub:канал, chat:канал, ref, case, wallet');
  }

  const nextId = ++DB.customTaskCounter;
  const task = { id: nextId, icoKey: check, tag, tc, name, desc, rew: reward, check, isNew };
  if (channel) { task.channel = channel; task.url = url; }

  if (!DB.customTasks) DB.customTasks = [];
  DB.customTasks.push(task);
  saveDB();

  ctx.reply(
    `✅ Задание #${nextId} создано!\n\n` +
    `📌 Название: ${name}\n` +
    `📝 Описание: ${desc}\n` +
    `🏷 Тип: ${tag} (${check})\n` +
    `💰 Награда: ${reward} монет\n` +
    (channel ? `📢 Канал/чат: @${channel}\n` : '') +
    (isNew ? `🆕 Метка: NEW\n` : '') +
    `\n🔢 ID задания: ${nextId}\n` +
    `Удалить: /deltask ${nextId}`
  );
});

bot.command('deltask', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Формат: /deltask <ID>');
  const id = parseInt(parts[1], 10);
  if (!DB.customTasks) return ctx.reply('❌ Нет созданных заданий');
  const idx = DB.customTasks.findIndex(t => t.id === id);
  if (idx === -1) return ctx.reply(`❌ Задание #${id} не найдено`);
  const removed = DB.customTasks.splice(idx, 1)[0];
  saveDB();
  ctx.reply(`✅ Задание #${id} "${removed.name}" удалено`);
});

bot.command('tasklist', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  if (!DB.customTasks || DB.customTasks.length === 0) return ctx.reply('📋 Нет созданных заданий');
  const list = DB.customTasks.map(t =>
    `#${t.id} [${t.check}] ${t.name} — ${t.rew}🪙${t.isNew ? ' 🆕' : ''}`
  ).join('\n');
  ctx.reply(`📋 Список заданий (${DB.customTasks.length}):\n\n${list}`);
});

/* ══ /cdraw — поддержка фото ══ */
async function handleCdraw(ctx, text, photo) {
  if (!isAdmin(ctx.from.id)) return;
  const raw = (text || '').replace('/cdraw', '').trim();
  const parts = raw.split(' ');
  if (parts.length < 2) return ctx.reply(
    'Формат: /cdraw ПРИЗ ВРЕМЯ [КОЛ-ВО_ПОБЕДИТЕЛЕЙ]\n\n' +
    'Примеры:\n' +
    '/cdraw 1000 1 минута\n' +
    '/cdraw iPhone 2 часа\n' +
    '/cdraw 5000 1 день 3\n\n' +
    '📎 Картинка — прикрепи фото, команда в подписи (caption)\n\n' +
    'После создания:\n' +
    '/addcond ID tg @channel Название — добавить TG условие\n' +
    '/addcond ID kick channel Название — Kick условие\n' +
    '/addcond ID custom Текст — пользоват. условие\n' +
    '/cdesc ID Текст — добавить описание\n' +
    '/drawinfo ID — инфо о розыгрыше'
  );

  const prize = parts[0];
  const timeWords = ['мин','минут','минута','минуты','час','часа','часов','день','дня','дней','дн'];

  let timeParts = parts.slice(1);
  let winnersCount = 1;
  let requireTicket = false;

  const lastEl = (timeParts[timeParts.length - 1] || '').toLowerCase();
  if (lastEl.includes('билет')) {
    requireTicket = true;
    timeParts = timeParts.slice(0, -1);
  }

  const lastPart = timeParts[timeParts.length - 1] || '';
  const prevPart = timeParts[timeParts.length - 2] || '';
  const lastIsNum = /^\d+$/.test(lastPart);
  const prevIsTime = timeWords.some(w => prevPart.toLowerCase().includes(w));
  if (lastIsNum && prevIsTime) {
    winnersCount = Math.max(1, Math.min(parseInt(lastPart), 100));
    timeParts = timeParts.slice(0, -1);
  }

  const timeStr = timeParts.join(' ');
  const num = parseInt(timeStr) || 1;
  let ms = 3600000;
  if (timeStr.includes('мин')) ms = num * 60000;
  else if (timeStr.includes('час')) ms = num * 3600000;
  else if (timeStr.includes('ден') || timeStr.includes('дн') || timeStr.includes('день')) ms = num * 86400000;
  if (ms < 10000) ms = 10000;

  const moneyPrize = isMoney(prize);
  const id = ++DB.drawCounter;

  let imageUrl = null;
  if (photo) {
    const bigPhoto = photo[photo.length - 1];
    imageUrl = await getPhotoUrl(bigPhoto.file_id);
  }

  DB.draws[id] = {
    id, prize, endsAt: Date.now() + ms, imageUrl,
    participants: [], finished: false,
    winnersCount, requireTicket, createdAt: Date.now()
  };

  const amountNote = moneyPrize && winnersCount > 1
    ? `\n💰 По ${Math.floor(parseInt(prize)/winnersCount)} монет каждому`
    : moneyPrize ? '\n💰 Монеты начислятся победителю автоматически'
    : '\n📦 Уведомление победителю';

  ctx.reply(
    `✅ Розыгрыш #${id} создан!\n` +
    `🏆 Приз: ${prize}${moneyPrize ? ' монет' : ''}\n` +
    `👑 Победителей: ${winnersCount}\n` +
    `🎟 Вход: ${requireTicket ? 'Требует билет' : 'Бесплатный'}\n` +
    `⏱ Длится: ${timeStr}` +
    amountNote +
    `\n📱 Уже в приложении!` +
    (imageUrl ? '\n🖼 Картинка добавлена' : '')
  );

  setTimeout(() => finishDraw(id), ms);
}

bot.command('cdraw', (ctx) => {
  handleCdraw(ctx, ctx.message.text, null);
});

/* /addcond DRAW_ID tg @channel Название
   /addcond DRAW_ID kick channel Название URL
   /addcond DRAW_ID custom Текст условия
   /addcond DRAW_ID clear — удалить все условия */
bot.command('addcond', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  const drawId = parseInt(parts[1]);
  const type = (parts[2] || '').toLowerCase();
  const draw = DB.draws[drawId];
  if (!draw) return ctx.reply(`❌ Розыгрыш #${drawId} не найден`);
  if (!draw.conditions) draw.conditions = [];

  if (type === 'clear') {
    draw.conditions = [];
    saveDB();
    return ctx.reply(`✅ Условия розыгрыша #${drawId} очищены`);
  }

  if (type === 'tg') {
    const channel = parts[3] || '';
    const name = parts.slice(4).join(' ') || channel.replace('@', '');
    const url = `https://t.me/${channel.replace('@', '')}`;
    draw.conditions.push({ type: 'tg', channel, name, url });
    saveDB();
    return ctx.reply(`✅ Условие добавлено к #${drawId}:\n📢 Telegram: ${name} (${channel})\nВсего условий: ${draw.conditions.length}`);
  }

  if (type === 'kick') {
    const channel = parts[3] || '';
    const lastArg = parts[parts.length - 1] || '';
    const hasUrl = lastArg.startsWith('http');
    const name = hasUrl ? parts.slice(4, -1).join(' ') || channel : parts.slice(4).join(' ') || channel;
    const url = hasUrl ? lastArg : `https://kick.com/${channel}`;
    draw.conditions.push({ type: 'kick', channel, name, url });
    saveDB();
    return ctx.reply(`✅ Условие добавлено к #${drawId}:\n🎮 Kick: ${name}\nВсего условий: ${draw.conditions.length}`);
  }

  if (type === 'custom') {
    const text = parts.slice(3).join(' ');
    if (!text) return ctx.reply('Укажи текст условия после "custom"');
    draw.conditions.push({ type: 'custom', text });
    saveDB();
    return ctx.reply(`✅ Пользовательское условие добавлено к #${drawId}:\n📋 ${text}\nВсего условий: ${draw.conditions.length}`);
  }

  ctx.reply(
    'Формат:\n' +
    '/addcond ID tg @channel Название канала\n' +
    '/addcond ID kick channel Название URL\n' +
    '/addcond ID custom Текст условия\n' +
    '/addcond ID clear — удалить все условия'
  );
});

/* /cdesc DRAW_ID текст описания */
bot.command('cdesc', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  const drawId = parseInt(parts[1]);
  const desc = parts.slice(2).join(' ');
  const draw = DB.draws[drawId];
  if (!draw) return ctx.reply(`❌ Розыгрыш #${drawId} не найден`);
  draw.description = desc;
  saveDB();
  ctx.reply(`✅ Описание розыгрыша #${drawId} обновлено:\n"${desc}"`);
});

/* /drawinfo DRAW_ID — информация о розыгрыше */
bot.command('drawinfo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  const drawId = parseInt(parts[1]);
  const draw = DB.draws[drawId];
  if (!draw) return ctx.reply(`❌ Розыгрыш #${drawId} не найден`);
  const conds = (draw.conditions || []).map((c, i) => {
    if (c.type === 'tg') return `  ${i+1}. TG: ${c.name} (${c.channel})`;
    if (c.type === 'kick') return `  ${i+1}. Kick: ${c.name}`;
    return `  ${i+1}. Custom: ${c.text}`;
  }).join('\n') || '  Нет условий';
  const timeLeft = Math.ceil((draw.endsAt - Date.now()) / 60000);
  ctx.reply(
    `📋 Розыгрыш #${drawId}\n` +
    `🏆 Приз: ${draw.prize}\n` +
    `⏱ Осталось: ${timeLeft} мин\n` +
    `👥 Участников: ${draw.participants.length}\n` +
    `👑 Победителей: ${draw.winnersCount || 1}\n` +
    `🎟 Билет: ${draw.requireTicket ? 'Да' : 'Нет'}\n` +
    `📝 Описание: ${draw.description || 'нет'}\n` +
    `📌 Условия:\n${conds}`
  );
});

bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const caption = ctx.message.caption || '';

  // /cdraw с фото
  if (caption.startsWith('/cdraw')) {
    handleCdraw(ctx, caption, ctx.message.photo);
    return;
  }

  // /broadcast_photo — рассылка с фото
  // Использование: прикрепи фото и напиши в подписи:
  // /broadcast_photo Текст сообщения
  if (caption.startsWith('/broadcast_photo')) {
    const text = caption.replace('/broadcast_photo', '').trim();
    if (!text) return ctx.reply('Добавь текст после команды.\nПример: /broadcast_photo 🎁 Новый розыгрыш!');
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const userIds = Object.keys(DB.users);
    if (!userIds.length) return ctx.reply('❌ Нет пользователей в базе');
    const statusMsg = await ctx.reply(`📤 Начинаю рассылку с фото...\n👥 Получателей: ${userIds.length}`);
    let sent = 0, failed = 0, blocked = 0;
    for (const uid of userIds) {
      try {
        await bot.telegram.sendPhoto(Number(uid), fileId, {
          caption: text,
          reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
        });
        sent++;
      } catch (e) {
        if (e.description?.includes('blocked') || e.description?.includes('deactivated')) blocked++;
        else failed++;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    await bot.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined,
      `✅ Рассылка с фото завершена!\n\n📤 Отправлено: ${sent}\n🚫 Заблокировали бота: ${blocked}\n❌ Ошибки: ${failed}\n👥 Всего в базе: ${userIds.length}`
    );
  }
});

bot.command('pgive', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Формат: /pgive @username СУММА\nПример: /pgive @assate 5000');
  const username = parts[1].replace('@', '').toLowerCase();
  const amount = Number(parts[2]);
  if (!amount || amount <= 0) return ctx.reply('❌ Неверная сумма');
  let targetUID = null;
  for (const [uid, u] of Object.entries(DB.users)) {
    if (u.username === username) { targetUID = uid; break; }
  }
  if (!targetUID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`);
      const d = await r.json();
      if (d.ok && d.result?.id) {
        targetUID = String(d.result.id);
        const u = getUser(targetUID);
        u.username = username;
        u.firstName = d.result.first_name || '';
      }
    } catch {}
  }
  if (!targetUID) return ctx.reply(`❌ @${username} не найден.\nПопроси его написать /start боту и повтори.`);
  const u = getUser(targetUID);
  u.balance += amount;
  u.serverBalance = u.balance; // mark as authoritative
  saveDB();
  try {
    await ctx.telegram.sendMessage(Number(targetUID),
      `💰 Администратор начислил тебе ${amount.toLocaleString('ru')} монет!\n💼 Баланс: ${u.balance.toLocaleString('ru')}`
    );
  } catch {}
  ctx.reply(`✅ @${username} получил ${amount.toLocaleString('ru')} монет\n💼 Баланс: ${u.balance.toLocaleString('ru')}`);
});


/* ══ /delm — снятие монет у пользователя ══ */
bot.command('delm', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Формат: /delm @username СУММА ПРИЧИНА\nПример: /delm @assate 100 Нарушение правил');
  const username = parts[1].replace('@', '').toLowerCase();
  const amount = Number(parts[2]);
  const reason = parts.slice(3).join(' ');
  if (!amount || amount <= 0) return ctx.reply('❌ Неверная сумма');

  let targetUID = null;
  for (const [uid, u] of Object.entries(DB.users)) {
    if ((u.username||'').toLowerCase() === username) { targetUID = uid; break; }
  }
  if (!targetUID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`);
      const d = await r.json();
      if (d.ok && d.result?.id) {
        targetUID = String(d.result.id);
        const u = getUser(targetUID);
        u.username = username;
        u.firstName = d.result.first_name || '';
      }
    } catch {}
  }
  if (!targetUID) return ctx.reply(`❌ @${username} не найден.`);

  const u = getUser(targetUID);
  const before = u.balance;
  u.balance = Math.max(0, u.balance - amount);
  u.serverBalance = u.balance;
  addTx(targetUID, 'adjustment', `-${amount}`, reason);
  saveDB();

  try {
    await ctx.telegram.sendMessage(Number(targetUID),
      `⚠️ Администратор снял ${amount.toLocaleString('ru')} монет.\nПричина: ${reason}\n💼 Баланс: ${u.balance.toLocaleString('ru')}`
    );
  } catch {}
  ctx.reply(`✅ У @${username} снято ${amount.toLocaleString('ru')} монет\nПричина: ${reason}\nБыло: ${before.toLocaleString('ru')} → Стало: ${u.balance.toLocaleString('ru')}`);
});

/* ══ /sgive — начисление Stars вручную (для тестирования) ══ */
bot.command('sgive', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Формат: /sgive @username КОЛИЧЕСТВО\nПример: /sgive @assate 100');
  const username = parts[1].replace('@', '').toLowerCase();
  const amount = Number(parts[2]);
  if (!amount || amount <= 0) return ctx.reply('❌ Неверное количество');
  let targetUID = null;
  for (const [uid, u] of Object.entries(DB.users)) {
    if (u.username === username) { targetUID = uid; break; }
  }
  if (!targetUID) return ctx.reply(`❌ @${username} не найден. Попроси написать /start.`);
  const u = getUser(targetUID);
  u.starsBalance = (u.starsBalance || 0) + amount;
  try {
    await ctx.telegram.sendMessage(Number(targetUID),
      `⭐ Администратор начислил тебе ${amount} Stars!\n⭐ Баланс Stars: ${u.starsBalance}`
    );
  } catch {}
  ctx.reply(`✅ @${username} получил ${amount} Stars\n⭐ Баланс Stars: ${u.starsBalance}`);
});

bot.command('ddelete', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Формат: /ddelete #ID\nПример: /ddelete #3');
  const id = parseInt((parts[1] || '').replace('#', ''));
  if (!id) return ctx.reply('❌ Неверный ID');
  if (DB.draws[id] && !DB.draws[id].finished) return ctx.reply(`❌ Розыгрыш #${id} ещё активен. Удалять можно только завершённые.`);
  if (!DB.finished[id]) return ctx.reply(`❌ Завершённый розыгрыш #${id} не найден.`);
  delete DB.finished[id];
  ctx.reply(`✅ Розыгрыш #${id} удалён из архива.`);
});


/* ══ ADMIN: /sprom — рассылка промокода с картинкой ══ */
bot.command('sprom', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 2) return ctx.reply('Формат: /sprom ПРОМОКОД\nПример: /sprom GIFT2024');

  const code = parts[1].toUpperCase();
  const promo = DB.promos[code];
  if (!promo) return ctx.reply(`❌ Промокод "${code}" не найден.\nСписок: /promos`);

  const reward = promo.reward;

  // Draw promo image: jimp with built-in bitmap font (no system fonts needed)
  let imgBuffer;
  try {
    const bgPath = path.join(__dirname, 'promo_bg.jpg');
    const img    = await Jimp.read(bgPath);
    const W = img.getWidth(), H = img.getHeight();

    // Field center: y≈682 for 800px tall image (78.5%–92% of H)
    const fieldCy = Math.round(H * 0.852);

    // Use FONT_SANS_64_WHITE — pure bitmap, always works
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    // Measure to center
    const textW = Jimp.measureText(font, code);
    const textH = Jimp.measureTextHeight(font, code, W);
    const x = Math.round((W - textW) / 2);
    const y = Math.round(fieldCy - textH / 2);

    // Glow effect: print same text slightly offset in cyan tint
    const glowOffsets = [
      {dx:-3,dy:-3},{dx:3,dy:-3},{dx:-3,dy:3},{dx:3,dy:3},
      {dx:0,dy:-4},{dx:0,dy:4},{dx:-4,dy:0},{dx:4,dy:0},
    ];
    // Load cyan-tinted version for glow
    const glowImg = await Jimp.read(bgPath);
    glowImg.opacity(0); // clear to transparent
    const fontGlow = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    for (const {dx, dy} of glowOffsets) {
      img.print(fontGlow, x + dx, y + dy, code);
    }

    // Main text — centered, white
    img.print(font, x, y, code);

    imgBuffer = await img.getBufferAsync(Jimp.MIME_JPEG);
  } catch (e) {
    console.error('jimp error:', e);
    return ctx.reply('❌ Ошибка генерации картинки: ' + e.message);
  }

  const caption = `🎁 Лови промокод на ${reward.toLocaleString('ru')} 🪙!\n\nАктивируй в приложении 👇🏻`;
  const userIds = Object.keys(DB.users);
  if (!userIds.length) return ctx.reply('❌ Нет пользователей в базе');

  const statusMsg = await ctx.reply(`📤 Рассылка промокода ${code}...\n👥 Получателей: ${userIds.length}`);
  let sent = 0, failed = 0, blocked = 0;

  for (const uid of userIds) {
    try {
      await bot.telegram.sendPhoto(Number(uid), { source: imgBuffer }, {
        caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{
            text: '🎁 Открыть SatApp Gifts',
            web_app: { url: APP_URL }
          }]]
        }
      });
      sent++;
    } catch (e) {
      if (e.description?.includes('blocked') || e.description?.includes('deactivated')) blocked++;
      else failed++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  await bot.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined,
    `✅ Рассылка завершена!\n\n🎟 Промокод: ${code}\n💰 Награда: ${reward.toLocaleString('ru')} 🪙\n\n📤 Отправлено: ${sent}\n🚫 Заблокировали: ${blocked}\n❌ Ошибки: ${failed}\n👥 Всего: ${userIds.length}`
  );
});

bot.command('promos', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = Object.entries(DB.promos)
    .map(([c, p]) => `• ${c}: +${p.reward}🪙  ${p.usedCount}/${p.maxUses}${p.vipOnly ? ' 👑' : ''}`)
    .join('\n');
  ctx.reply(list ? `📋 Промокоды:\n\n${list}` : 'Промокодов нет');
});

bot.command('draws', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const now = Date.now();
  const active = Object.values(DB.draws).filter(d => !d.finished && d.endsAt > now);
  const fin = Object.values(DB.finished);
  let msg = '';
  if (active.length) msg += `🟢 Активные:\n` + active.map(d => `• #${d.id}: ${d.prize} | ${d.participants.length} уч. | ~${Math.ceil((d.endsAt-now)/60000)} мин | ${d.winnersCount} поб.`).join('\n');
  if (fin.length) msg += `\n\n🔴 Завершённые:\n` + fin.map(d => `• #${d.id}: ${d.prize} | ${(d.winners||[]).map(w=>w.name).join(', ')||'нет поб.'}`).join('\n');
  ctx.reply(msg || 'Розыгрышей нет');
});

bot.command('users', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.reply(`👥 Пользователей: ${Object.keys(DB.users).length}`);
});

bot.command('stars', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const invoices = Object.values(DB.starsInvoices);
  const paid = invoices.filter(i => i.paid);
  const pending = invoices.filter(i => !i.paid);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);
  ctx.reply(
    `⭐ Stars статистика:\n\n` +
    `✅ Оплачено: ${paid.length} счетов (${totalPaid} Stars)\n` +
    `⏳ Ожидают: ${pending.length} счетов\n\n` +
    `Топ Stars-балансы:\n` +
    Object.values(DB.users)
      .filter(u => u.starsBalance > 0)
      .sort((a, b) => b.starsBalance - a.starsBalance)
      .slice(0, 10)
      .map(u => `• @${u.username||'?'}: ${u.starsBalance} ⭐`)
      .join('\n') || '(пусто)'
  );
});

/* ══ РАССЫЛКА ══ */

// /broadcast ТЕКСТ — отправить всем пользователям

// /send [тип] ТЕКСТ — добавить уведомление в приложение (видят все пользователи)
// Типы: promo | win | system | alert (опционально, по умолчанию system)
bot.command('send', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const raw = ctx.message.text.replace(/^\/send\S*\s*/, '').trim();
  if (!raw) return ctx.reply(
    '📨 Формат: /send [тип] ТЕКСТ\n\n' +
    'Типы уведомлений:\n' +
    '  promo  — 🎁 акции и бонусы\n' +
    '  win    — 🏆 победы и розыгрыши\n' +
    '  system — 🔔 системные (по умолчанию)\n' +
    '  alert  — ⚠️ важные предупреждения\n\n' +
    'Примеры:\n' +
    '/send promo Кейсы со скидкой 20% — только сегодня!\n' +
    '/send win Поздравляем победителей турнира!\n' +
    '/send Технические работы завтра в 03:00'
  );
  const TYPES = ['promo','win','system','alert'];
  const parts = raw.split(' ');
  let type = 'system', text = raw;
  if (TYPES.includes(parts[0])) { type = parts.shift(); text = parts.join(' ').trim(); }
  if (!text) return ctx.reply('❌ Текст уведомления не может быть пустым');
  if (!DB.notifications) DB.notifications = [];
  const notif = { id: Date.now(), type, text, ts: Date.now() };
  DB.notifications.unshift(notif);
  if (DB.notifications.length > 100) DB.notifications = DB.notifications.slice(0, 100);
  saveDB();
  const typeEmoji = { promo:'🎁', win:'🏆', system:'🔔', alert:'⚠️' };
  ctx.reply(`✅ Уведомление отправлено!\n\n${typeEmoji[type]||'🔔'} [${type}] ${text}\n\n👥 Увидят все пользователи в течение 30 сек`);
});

// /deln ID — удалить конкретное уведомление
bot.command('deln', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const idStr = ctx.message.text.replace(/^\/deln\S*\s*/, '').trim();
  const id = Number(idStr);
  if (!id) return ctx.reply('Формат: /deln ID\n\nID можно найти в /notiflist');
  if (!DB.notifications) DB.notifications = [];
  const before = DB.notifications.length;
  DB.notifications = DB.notifications.filter(n => n.id !== id);
  if (DB.notifications.length < before) { saveDB(); ctx.reply('🗑 Уведомление #' + id + ' удалено'); }
  else ctx.reply('❌ Уведомление с ID ' + id + ' не найдено');
});

// /clearnotifs — удалить все уведомления
bot.command('clearnotifs', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  DB.notifications = [];
  saveDB();
  ctx.reply('🗑 Все уведомления удалены');
});

// /notiflist — список текущих уведомлений
bot.command('notiflist', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const notifs = DB.notifications || [];
  if (!notifs.length) return ctx.reply('📭 Уведомлений нет');
  const typeEmoji = { promo:'🎁', win:'🏆', system:'🔔', alert:'⚠️' };
  const lines = notifs.slice(0, 20).map(n =>
    `${typeEmoji[n.type]||'🔔'} #${n.id}\n   [${n.type||'system'}] ${n.text}\n   ${new Date(n.ts).toLocaleString('ru')}`
  ).join('\n\n');
  ctx.reply(`📋 Активных: ${notifs.length}\n\n${lines}\n\n🗑 Удалить: /deln ID\n🗑 Очистить все: /clearnotifs`);
});

bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) return ctx.reply(
    'Формат: /broadcast ТЕКСТ\n\nПример:\n/broadcast 🎁 Новый розыгрыш! Открывай приложение и участвуй!'
  );
  const userIds = Object.keys(DB.users);
  if (!userIds.length) return ctx.reply('❌ Нет пользователей в базе');
  const statusMsg = await ctx.reply(`📤 Начинаю рассылку...\n👥 Получателей: ${userIds.length}`);
  let sent = 0, failed = 0, blocked = 0;
  for (const uid of userIds) {
    try {
      await bot.telegram.sendMessage(Number(uid), text, {
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
      });
      sent++;
    } catch (e) {
      if (e.description?.includes('blocked') || e.description?.includes('deactivated')) blocked++;
      else failed++;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  await bot.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined,
    `✅ Рассылка завершена!\n\n📤 Отправлено: ${sent}\n🚫 Заблокировали бота: ${blocked}\n❌ Ошибки: ${failed}\n👥 Всего в базе: ${userIds.length}`
  );
});

// /broadcast_vip ТЕКСТ — отправить только VIP пользователям
bot.command('broadcast_vip', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text.replace('/broadcast_vip', '').trim();
  if (!text) return ctx.reply('Формат: /broadcast_vip ТЕКСТ');
  const now = Date.now();
  const vipUsers = Object.entries(DB.users)
    .filter(([, u]) => u.vipExpiry && u.vipExpiry > now)
    .map(([uid]) => uid);
  if (!vipUsers.length) return ctx.reply('❌ Нет активных VIP пользователей');
  const statusMsg = await ctx.reply(`📤 Рассылка VIP...\n👑 Получателей: ${vipUsers.length}`);
  let sent = 0, failed = 0;
  for (const uid of vipUsers) {
    try {
      await bot.telegram.sendMessage(Number(uid), '👑 ' + text, {
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
      });
      sent++;
    } catch { failed++; }
    await new Promise(r => setTimeout(r, 50));
  }
  await bot.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined,
    `✅ VIP рассылка завершена!\n\n📤 Отправлено: ${sent}\n❌ Ошибки: ${failed}`
  );
});

// /bc_count — статистика перед рассылкой
bot.command('bc_count', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const total = Object.keys(DB.users).length;
  const now = Date.now();
  const vip = Object.values(DB.users).filter(u => u.vipExpiry && u.vipExpiry > now).length;
  ctx.reply(
    `📊 Статистика рассылки:\n\n` +
    `👥 Всего пользователей: ${total}\n` +
    `👑 VIP активных: ${vip}\n\n` +
    `Команды:\n` +
    `/broadcast ТЕКСТ — всем\n` +
    `/broadcast_vip ТЕКСТ — только VIP\n` +
    `/broadcast_photo ТЕКСТ — всем с фото (caption)`
  );
});


/* ══ ADMIN: СБРОС СТАТИСТИКИ ══ */


// /stat @username — статистика пользователя
bot.command('stat', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(' ').slice(1);
  if (!args.length) return ctx.reply('❌ Укажи: /stat @username');
  const username = args[0].replace('@','').toLowerCase();
  const uid = findUidByUsername(username);
  if (!uid) return ctx.reply(`❌ Пользователь @${username} не найден в базе`);
  const u = DB.users[uid];
  if (!u) return ctx.reply('❌ Данные не найдены');

  const now = Date.now();
  const balance = (u.balance||0).toLocaleString('ru');
  const stars   = u.starsBalance||0;

  // VIP
  let vipStr = '❌ Нет';
  if (u.vipExpiry && u.vipExpiry > now) {
    const daysLeft = Math.ceil((u.vipExpiry - now) / 86400000);
    vipStr = `✅ Активен (${daysLeft} дн. осталось)`;
  }

  // Last seen
  let lastSeen = '—';
  if (u.lastSeen) {
    const d = new Date(u.lastSeen);
    const diff = now - u.lastSeen;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    const msk = mskDate(u.lastSeen);
    const timeOnly = mskTimeFmt(u.lastSeen);
    if (days > 0) {
      lastSeen = `${mskFmt(u.lastSeen, {day:'numeric',month:'short'})} в ${timeOnly} (${days}д назад)`;
    } else if (hours > 0) {
      lastSeen = `Сегодня в ${timeOnly} (${hours}ч ${mins % 60}м назад)`;
    } else if (mins > 0) {
      lastSeen = `Сегодня в ${timeOnly} (${mins}м назад)`;
    } else {
      lastSeen = `Сегодня в ${timeOnly} (только что)`;
    }
  }

  // Reg date
  // regDate already stored as formatted string OR as timestamp
  let regDate = '—';
  if (u.regDate) {
    const asNum = Number(u.regDate);
    if (!isNaN(asNum) && asNum > 1000000000000) {
      regDate = mskFmt(asNum, {day:'numeric',month:'long',year:'numeric'});
    } else {
      regDate = String(u.regDate);
    }
  }

  // Crown / Legend
  const hasCrown = u.hasCrown ? '👑 Есть' : '—';
  let legendStr = '—';
  if (u.legendExpiry && u.legendExpiry > now) {
    const ld = Math.ceil((u.legendExpiry - now) / 86400000);
    legendStr = `✨ Активна (${ld} дн.)`;
  }

  const msg = `👤 Профиль @${username}

💰 Баланс: ${balance} монет
⭐ Stars: ${stars}
👑 VIP: ${vipStr}
✨ Легенда: ${legendStr}
${hasCrown !== '—' ? '👑 Корона: Есть | ' : ''}📅 Зарегистрирован: ${regDate}
🕐 Последний вход: ${lastSeen}
🆔 UID: ${uid}`;

  ctx.reply(msg);
});

// /dstats — сбросить статистику ВСЕХ пользователей (кроме Stars)
bot.command('dstats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const uids = Object.keys(DB.users);
  if (!uids.length) return ctx.reply('❌ Нет пользователей в базе');
  const msg = await ctx.reply(`⚠️ Сбросить статистику ВСЕХ ${uids.length} пользователей?\n\nБудет сброшено: баланс, VIP, инвентарь, корона, легенда, задания.\n⭐ Stars не тронутся.\n\nОтвет: да / нет`);
  // Ждём подтверждения через следующее сообщение
  bot.on('text', async (c) => {
    if (!isAdmin(c.from.id)) return;
    if (c.message.reply_to_message?.message_id !== msg.message_id) return;
    const ans = c.message.text.toLowerCase();
    if (ans !== 'да' && ans !== 'yes') return c.reply('❌ Отменено');
    let count = 0;
    for (const uid of uids) { if (resetUserStats(uid)) count++; }
    c.reply(`✅ Статистика сброшена у ${count} пользователей.\n⭐ Stars не тронуты.`);
  });
});


// /stat @username — статистика пользователя
bot.command('stat', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(' ').slice(1);
  if (!args.length) return ctx.reply('❌ Укажи: /stat @username');
  const username = args[0].replace('@','').toLowerCase();
  const uid = findUidByUsername(username);
  if (!uid) return ctx.reply(`❌ Пользователь @${username} не найден в базе`);
  const u = DB.users[uid];
  if (!u) return ctx.reply('❌ Данные не найдены');

  const now = Date.now();
  const balance = (u.balance||0).toLocaleString('ru');
  const stars   = u.starsBalance||0;

  // VIP
  let vipStr = '❌ Нет';
  if (u.vipExpiry && u.vipExpiry > now) {
    const daysLeft = Math.ceil((u.vipExpiry - now) / 86400000);
    vipStr = `✅ Активен (${daysLeft} дн. осталось)`;
  }

  // Last seen
  let lastSeen = '—';
  if (u.lastSeen) {
    const d = new Date(u.lastSeen);
    const diff = now - u.lastSeen;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    const msk = mskDate(u.lastSeen);
    const timeOnly = mskTimeFmt(u.lastSeen);
    if (days > 0) {
      lastSeen = `${mskFmt(u.lastSeen, {day:'numeric',month:'short'})} в ${timeOnly} (${days}д назад)`;
    } else if (hours > 0) {
      lastSeen = `Сегодня в ${timeOnly} (${hours}ч ${mins % 60}м назад)`;
    } else if (mins > 0) {
      lastSeen = `Сегодня в ${timeOnly} (${mins}м назад)`;
    } else {
      lastSeen = `Сегодня в ${timeOnly} (только что)`;
    }
  }

  // Reg date
  // regDate already stored as formatted string OR as timestamp
  let regDate = '—';
  if (u.regDate) {
    const asNum = Number(u.regDate);
    if (!isNaN(asNum) && asNum > 1000000000000) {
      regDate = mskFmt(asNum, {day:'numeric',month:'long',year:'numeric'});
    } else {
      regDate = String(u.regDate);
    }
  }

  // Crown / Legend
  const hasCrown = u.hasCrown ? '👑 Есть' : '—';
  let legendStr = '—';
  if (u.legendExpiry && u.legendExpiry > now) {
    const ld = Math.ceil((u.legendExpiry - now) / 86400000);
    legendStr = `✨ Активна (${ld} дн.)`;
  }

  const msg = `👤 Профиль @${username}

💰 Баланс: ${balance} монет
⭐ Stars: ${stars}
👑 VIP: ${vipStr}
✨ Легенда: ${legendStr}
${hasCrown !== '—' ? '👑 Корона: Есть | ' : ''}📅 Зарегистрирован: ${regDate}
🕐 Последний вход: ${lastSeen}
🆔 UID: ${uid}`;

  ctx.reply(msg);
});

// /dstats_user @username — сбросить статистику конкретного пользователя
bot.command('dstats_user', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(/\s+/);
  const rawUsername = args[1];
  if (!rawUsername) return ctx.reply('Формат: /dstats_user @username\n\nПример: /dstats_user @ivan');

  const username = rawUsername.replace(/^@/, '').toLowerCase();
  const uid = findUidByUsername(username);

  if (!uid) {
    return ctx.reply(`❌ Пользователь @${username} не найден в базе.\n\nПользователь должен хотя бы раз открыть приложение.`);
  }

  const u = DB.users[uid];
  const stars = u.starsBalance || 0;
  resetUserStats(uid);
  saveDB();

  ctx.reply(
    `✅ Статистика @${username} сброшена!\n\n` +
    `👤 UID: ${uid}\n` +
    `⭐ Stars сохранены: ${stars}\n` +
    `💰 Баланс обнулён\n` +
    `🏆 VIP удалён\n` +
    `📦 Инвентарь очищен\n` +
    `👑 Корона удалена\n` +
    `✅ Задания сброшены`
  );
});

/* ══ ADMIN: БАН ══ */

// /ban @username время — забанить пользователя
// время: "1 час", "7 дней", "0" = навсегда
bot.command('ban', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.replace('/ban', '').trim().split(/\s+/);
  const rawUsername = parts[0];
  const timeStr = parts.slice(1).join(' ');

  if (!rawUsername) {
    return ctx.reply(
      'Формат: /ban @username время\n\n' +
      'Примеры:\n' +
      '/ban @ivan 0 — навсегда\n' +
      '/ban @ivan 1 час\n' +
      '/ban @ivan 7 дней\n' +
      '/ban @ivan 1 неделя\n' +
      '/ban @ivan 1 месяц'
    );
  }

  const username = rawUsername.replace(/^@/, '').toLowerCase();
  const until = parseBanDuration(timeStr || '0');

  if (until === null) {
    return ctx.reply(`❌ Не понял время: "${timeStr}"\n\nПримеры: 1 час / 7 дней / 1 неделя / 0 (навсегда)`);
  }

  const banData = { until, bannedAt: Date.now() };
  DB.bans[username] = banData;

  // Если пользователь уже в базе — баним и по uid
  const uid = findUidByUsername(username);
  if (uid) DB.bansByUid[uid] = banData;
  saveDB();

  const untilStr = until === 0 ? '🔴 Навсегда' : `до ${new Date(until).toLocaleString('ru-RU')}`;
  const durationStr = until === 0 ? 'навсегда' : formatDuration(until);

  // Пытаемся уведомить пользователя
  if (uid) {
    try {
      await bot.telegram.sendMessage(Number(uid),
        `🚫 Вы заблокированы в боте.\n\n` +
        `⏱ Срок: ${durationStr}\n` +
        (until !== 0 ? `📅 Разбан: ${new Date(until).toLocaleString('ru-RU')}` : '')
      );
    } catch {}
  }

  ctx.reply(
    `🚫 @${username} забанен!\n\n` +
    `⏱ ${untilStr}\n` +
    `${uid ? `👤 UID найден: ${uid}` : '⚠️ Пользователь ещё не в базе — бан применится при первом входе'}\n\n` +
    `Разбанить: /unban @${username}`
  );
});

// /unban @username — снять бан
bot.command('unban', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(/\s+/);
  const rawUsername = parts[1];
  if (!rawUsername) return ctx.reply('Формат: /unban @username');

  const username = rawUsername.replace(/^@/, '').toLowerCase();
  const existed = DB.bans[username];
  delete DB.bans[username];

  const uid = findUidByUsername(username);
  if (uid) delete DB.bansByUid[uid];
  saveDB();

  if (!existed) return ctx.reply(`❌ @${username} не был забанен`);
  ctx.reply(`✅ @${username} разбанен!`);

  if (uid) {
    bot.telegram.sendMessage(Number(uid), `✅ Ваш бан снят! Добро пожаловать обратно к нам.`, {
      reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
    }).catch(() => {});
  }
});

// /bans — список забаненных
bot.command('bans', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = Object.entries(DB.bans);
  if (!list.length) return ctx.reply('✅ Забаненных нет');
  const now = Date.now();
  const rows = list.map(([un, b]) => {
    const active = b.until === 0 || b.until > now;
    const t = b.until === 0 ? 'навсегда' : formatDuration(b.until);
    return `${active ? '🚫' : '✅'} @${un} — ${t}`;
  });
  ctx.reply('🚫 Забаненные:\n\n' + rows.join('\n'));
});

bot.command('repair', async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  if (!isAdmin(ctx.from.id)) return;
  DB.repairMode = !DB.repairMode;
  saveDB();
  const status = DB.repairMode
    ? '🔧 Режим тех. работ ВКЛЮЧЁН. Приложение недоступно для пользователей.'
    : '✅ Тех. работы ВЫКЛЮЧЕНЫ. Приложение снова доступно.';
  ctx.reply(status, {
    reply_markup: {
      inline_keyboard: [[{ text: DB.repairMode ? '✅ Выключить тех. работы' : '🔧 Включить тех. работы', callback_data: 'toggle_repair' }]]
    }
  });
});

bot.action('toggle_repair', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('Нет доступа');
  DB.repairMode = !DB.repairMode;
  saveDB();
  const status = DB.repairMode
    ? '🔧 Режим тех. работ ВКЛЮЧЁН. Приложение недоступно для пользователей.'
    : '✅ Тех. работы ВЫКЛЮЧЕНЫ. Приложение снова доступно.';
  await ctx.editMessageText(status, {
    reply_markup: {
      inline_keyboard: [[{ text: DB.repairMode ? '✅ Выключить тех. работы' : '🔧 Включить тех. работы', callback_data: 'toggle_repair' }]]
    }
  });
  ctx.answerCbQuery();
});



/* ══ STARS EXCHANGE ══ */
app.post('/api/stars/exchange', (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.json({ ok: false, error: 'missing params' });
  const amt = Number(amount);
  if (!amt || amt < 1) return res.json({ ok: false, error: 'Неверное количество' });
  const u = getUser(userId);
  if (u.starsBalance < amt) return res.json({ ok: false, error: 'Недостаточно Stars' });
  u.starsBalance -= amt;
  u.balance += amt * 100;
  addTx(userId, 'stars_exchange', '+'+(amt*100), 'Обмен '+amt+' Stars → '+(amt*100)+' монет');
  saveDB();
  res.json({ ok: true, starsBalance: u.starsBalance, balance: u.balance, coins: amt * 100 });
});

/* ══ TRANSACTIONS API ══ */
app.get('/api/transactions', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ ok: false });
  const u = DB.users[String(userId)];
  if (!u) return res.json({ ok: true, transactions: [] });
  res.json({ ok: true, transactions: u.transactions || [] });
});

app.post('/api/transactions/add', (req, res) => {
  const { userId, type, amount, details } = req.body;
  if (!userId || !type) return res.json({ ok: false });
  addTx(userId, type, amount, details);
  saveDB();
  res.json({ ok: true });
});

/* ══ PvP WHEEL ══ */
const PVP_COLORS = ['#2ecc71','#e74c3c','#5b8def','#f39c12','#9b59b6','#1abc9c','#e67e22','#ff6fb7','#00e5ff','#f4c430'];
const PVP_MIN_BET = 50;
const PVP_MAX_PLAYERS = 10;
const PVP_FILL_MS = 20000;
const PVP_COUNTDOWN_MS = 5000;
const PVP_SPIN_MS = 5000;

if (!DB.pvp) DB.pvp = { game: null, history: [] };
if (!DB.pvp.history) DB.pvp.history = [];
let pvpTimer = null;

function clearPvpTimers() { if (pvpTimer) { clearTimeout(pvpTimer); pvpTimer = null; } }

function startPvpFilling() {
  const g = DB.pvp.game; if (!g) return;
  g.state = 'filling';
  g.fillEndsAt = Date.now() + PVP_FILL_MS;
  pvpTimer = setTimeout(() => startPvpCountdown(), PVP_FILL_MS);
}

function startPvpCountdown() {
  const g = DB.pvp.game; if (!g) return;
  if (g.players.length < 2) { DB.pvp.game = null; saveDB(); return; }
  g.state = 'countdown';
  g.countdownEndsAt = Date.now() + PVP_COUNTDOWN_MS;
  pvpTimer = setTimeout(() => startPvpSpin(), PVP_COUNTDOWN_MS);
}

function startPvpSpin() {
  const g = DB.pvp.game; if (!g) return;
  g.state = 'spinning';
  g.spinEndsAt = Date.now() + PVP_SPIN_MS;

  // Square-root weighted random — smooths bet advantage, everyone has real chance
  const total = g.players.reduce((s, p) => s + p.bet, 0);
  const sqrtWeights = g.players.map(p => Math.sqrt(p.bet));
  const sqrtTotal   = sqrtWeights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * sqrtTotal;
  let winner = g.players[g.players.length - 1];
  for (let i = 0; i < g.players.length; i++) {
    rand -= sqrtWeights[i];
    if (rand <= 0) { winner = g.players[i]; break; }
  }
  g.winner = winner;
  g.pendingPrize = total;
  g.collected = false;
  saveDB();

  pvpTimer = setTimeout(() => {
    if (DB.pvp.game) {
      const doneGame = DB.pvp.game;
      doneGame.state = 'done';
      // Auto-credit winner on server — do not rely on frontend collect call
      if (doneGame.winner && !doneGame.collected) {
        const prize = doneGame.pendingPrize || doneGame.totalBet || 0;
        if (prize > 0) {
          const winnerUser = getUser(doneGame.winner.uid);
          winnerUser.balance = (winnerUser.balance || 0) + prize;
          doneGame.collected = true;
        }
      }
      // Save to history
      if (doneGame.winner) {
        DB.pvp.history.unshift({
          id:          doneGame.id,
          time:        Date.now(),
          players:     doneGame.players.length,
          totalBet:    doneGame.totalBet,
          winnerName:  doneGame.winner.username ? '@'+doneGame.winner.username : doneGame.winner.firstName,
          winnerUid:   doneGame.winner.uid,
        });
        // Keep only last hour
        DB.pvp.history = DB.pvp.history.filter(h => Date.now() - h.time < 3600000);
      }
      saveDB();
      setTimeout(() => { DB.pvp.game = null; saveDB(); }, 15000);
    }
  }, PVP_SPIN_MS);
}

app.post('/api/pvp/join', (req, res) => {
  const { userId, username, firstName, photoUrl, bet } = req.body;
  if (!userId || !bet) return res.json({ ok: false, error: 'missing params' });
  const betN = Number(bet);
  if (betN < PVP_MIN_BET) return res.json({ ok: false, error: `Минимум ${PVP_MIN_BET} монет` });
  const u = getUser(userId);
  if (u.balance < betN) return res.json({ ok: false, error: 'Недостаточно монет' });

  let g = DB.pvp.game;

  if (g && !['done'].includes(g.state)) {
    if (g.players.find(p => p.uid === String(userId))) return res.json({ ok: false, error: 'Вы уже в игре' });
    if (['countdown','spinning'].includes(g.state)) return res.json({ ok: false, error: 'Игра уже началась' });
    if (g.players.length >= PVP_MAX_PLAYERS) return res.json({ ok: false, error: 'Игра заполнена' });

    u.balance -= betN;
    g.players.push({ uid: String(userId), username: username||'', firstName: firstName||'User', photoUrl: photoUrl||'', bet: betN, color: PVP_COLORS[g.players.length % 10] });
    g.totalBet += betN;

    if (g.players.length === 2) startPvpFilling();
    if (g.players.length >= PVP_MAX_PLAYERS) { clearPvpTimers(); startPvpCountdown(); }
  } else {
    u.balance -= betN;
    DB.pvp.game = {
      id: Date.now(), state: 'waiting',
      players: [{ uid: String(userId), username: username||'', firstName: firstName||'User', photoUrl: photoUrl||'', bet: betN, color: PVP_COLORS[0] }],
      totalBet: betN, winner: null, createdAt: Date.now(),
      fillEndsAt: null, countdownEndsAt: null, spinEndsAt: null,
    };
    g = DB.pvp.game;
  }

  saveDB();
  res.json({ ok: true, game: DB.pvp.game });
});

app.get('/api/pvp/state', (req, res) => {
  res.json({ ok: true, game: DB.pvp.game });
});

app.post('/api/pvp/leave', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ ok: false });
  const g = DB.pvp.game;
  if (!g) return res.json({ ok: false, error: 'Нет игры' });
  if (!['waiting','filling'].includes(g.state)) return res.json({ ok: false, error: 'Нельзя выйти после старта' });

  const idx = g.players.findIndex(p => p.uid === String(userId));
  if (idx === -1) return res.json({ ok: false, error: 'Вы не в игре' });

  const player = g.players[idx];
  const u = getUser(userId);
  u.balance += player.bet;
  g.totalBet -= player.bet;
  g.players.splice(idx, 1);

  if (g.players.length === 0) { clearPvpTimers(); DB.pvp.game = null; }
  else if (g.players.length === 1 && g.state === 'filling') {
    clearPvpTimers(); g.state = 'waiting'; g.fillEndsAt = null;
  }

  saveDB();
  res.json({ ok: true, refunded: player.bet });
});


app.post('/api/pvp/collect', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ ok: false, error: 'missing userId' });
  const uid = String(userId);

  // Check current game or recently ended game
  const g = DB.pvp.game;
  if (!g || !g.winner) return res.json({ ok: false, error: 'Нет завершённой игры' });
  if (g.winner.uid !== uid) return res.json({ ok: false, error: 'Вы не победитель' });

  const u = getUser(uid);

  // If server already auto-credited — just return current balance
  if (g.collected) {
    return res.json({ ok: true, prize: g.pendingPrize || g.totalBet || 0, balance: u.balance });
  }

  const prize = g.pendingPrize || g.totalBet || 0;
  if (prize <= 0) return res.json({ ok: false, error: 'Приз = 0' });

  u.balance += prize;
  g.collected = true;
  saveDB();

  res.json({ ok: true, prize, balance: u.balance });
});

/* ══ AVATAR PROXY (решает CORS для canvas) ══ */
app.get('/api/avatar', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://')) return res.status(400).end();
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(404).end();
    const buf = await r.arrayBuffer();
    const ct  = r.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buf));
  } catch {
    res.status(500).end();
  }
});


/* ══ PvP HISTORY ══ */
app.get('/api/pvp/history', (req, res) => {
  // Clean entries older than 1 hour
  DB.pvp.history = (DB.pvp.history || []).filter(h => Date.now() - h.time < 3600000);
  res.json({ ok: true, history: DB.pvp.history });
});

/* ══════════════════════════════════════════
   SUPPORT SYSTEM
   ══════════════════════════════════════════ */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SPECIALIST_ID = ADMIN_ID; // специалист = админ, можно вынести в .env

// activeSupport[specialistTgId] = userWebAppId (string)
const activeSupport = {};

const SUPPORT_SYS = `Ты — дружелюбный помощник поддержки Telegram-бота SatApp Gifts. Отвечай на ЛЮБЫЕ вопросы по-русски, кратко (2–4 предложения).

О боте SatApp Gifts:
- Telegram-бот для игр на монеты (внутренняя валюта)
- Игры: Соло (Колесо удачи), Дуэль (PvP против людей, ставь монеты и выигрывай весь банк), Мины (поле 5×5 — открывай клетки, избегай мин, забирай множитель)
- Монеты пополняются через Telegram Stars. Stars покупают прямо в Telegram
- Рефералы: приглашай друзей по реферальной ссылке → бонусные монеты
- Топ выигрышей: лучшие победы за последние 24ч, порог для попадания — 30 000 монет
- Вывод Stars — Вывод пока не доступен.
- При технических проблемах (не зачислились монеты, баг и т.д.) предлагай вызвать специалиста

В конце каждого своего ответа ВСЕГДА добавляй с новой строки:
"Если ответ не помог — напишите «вызвать специалиста»"`;

// GET /api/support/test
app.get('/api/support/test', async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.json({ ok: false, error: 'GROQ_API_KEY не установлен' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 50, messages: [{ role: 'user', content: 'скажи привет' }] })
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content;
    res.json({ ok: !!text, status: r.status, text: text || null, error: data?.error || null });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// POST /api/support/ai — Groq ИИ-агент (бесплатный) с контекстом пользователя
app.post('/api/support/ai', async (req, res) => {
  const { messages, userId } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ ok: false });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'no_key' });

  let userContext = '';
  if (userId && DB.users[String(userId)]) {
    const u = DB.users[String(userId)];
    userContext = `\nДанные пользователя:\n- Имя: ${u.firstName || '?'}\n- Монеты: ${u.balance || 0}\n- Stars: ${u.starsBalance || 0}\n- VIP: ${u.vipExpiry && u.vipExpiry > Date.now() ? 'да' : 'нет'}\n- Рефералов: ${u.refs?.length || 0}\n`;
  }

  const systemPrompt = `Ты — дружелюбный помощник поддержки SatApp Gifts. Отвечай ТОЛЬКО на русском языке, никогда не используй другие языки. Пиши кратко (2–4 предложения). Отвечай на ЛЮБЫЕ вопросы.\n\nО SatApp Gifts:\n- Игры на монеты: Соло, Дуэль (PvP), Мины (5×5)\n- Монеты — через Telegram Stars\n- Рефералы: приглашай → бонусы\n- Топ выигрышей за 24ч (от 30 000 монет)\n${userContext}\nВ конце КАЖДОГО ответа обязательно пиши ТОЧНО эту фразу (без изменений и опечаток): "Если ответ не помог — напишите «вызвать специалиста»"`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      })
    });
    const data = await r.json();
    console.log('[support] Groq:', r.status, JSON.stringify(data).slice(0, 200));
    const text = data?.choices?.[0]?.message?.content;
    if (text) return res.json({ ok: true, text });
    return res.status(500).json({ ok: false, debug: data?.error?.message || JSON.stringify(data).slice(0,200) });
  } catch (e) {
    console.error('[support] Groq error:', e.message);
    res.status(500).json({ ok: false, debug: e.message });
  }
});


// POST /api/support/specialist — уведомить специалиста
app.post('/api/support/specialist', async (req, res) => {
  const { userId, firstName } = req.body;
  if (!userId) return res.status(400).json({ ok: false });

  try {
    await bot.telegram.sendMessage(SPECIALIST_ID,
      `🆘 *Вас вызвали на помощь*\n\nПользователь: *${firstName || 'Неизвестный'}* (ID: ${userId})\n\nНажмите кнопку чтобы начать чат.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '💬 Ответить пользователю', callback_data: `support_reply:${userId}` }
          ]]
        }
      }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Specialist notify error:', e.message);
    res.status(500).json({ ok: false });
  }
});

// POST /api/support/from_specialist — специалист отправил сообщение через WebApp (запасной вариант)
// Основной путь: специалист пишет прямо в бот после нажатия кнопки

// Callback: специалист нажал "Ответить пользователю"
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data || '';
  // Отвечаем сразу чтобы не было timeout
  try { await ctx.answerCbQuery(); } catch {}

  if (!data.startsWith('support_reply:')) return;

  const userId = data.split(':')[1];
  const specId = ctx.from.id;

  activeSupport[specId] = userId;

  try { await ctx.deleteMessage(); } catch {}

  if (!DB.supportChats) DB.supportChats = {};
  DB.supportChats[String(userId)] = { specId, startedAt: Date.now(), status: 'active', pendingMessages: [] };

  await ctx.telegram.sendMessage(specId,
    `✅ Вы в чате с пользователем (ID: ${userId})\n\nВсе ваши сообщения будут отправлены ему в чат поддержки.\nДля завершения напишите /end_support`,
  );
});


// POST /api/support/user-end — пользователь завершил чат
app.post('/api/support/user-end', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false });

  const chat = DB.supportChats?.[String(userId)];
  if (chat) {
    const specId = chat.specId;
    chat.status = 'closed';
    // Убираем из activeSupport
    for (const [k, v] of Object.entries(activeSupport)) {
      if (String(v) === String(userId)) { delete activeSupport[k]; break; }
    }
    // Уведомляем специалиста
    if (specId) {
      try {
        await bot.telegram.sendMessage(specId,
          `❌ Пользователь завершил чат поддержки.`
        );
      } catch {}
    }
  }
  res.json({ ok: true });
});

// POST /api/support/user-message — пользователь пишет специалисту
app.post('/api/support/user-message', async (req, res) => {
  const { userId, firstName, text } = req.body;
  if (!userId || !text) return res.status(400).json({ ok: false });

  const chat = DB.supportChats?.[String(userId)];
  if (!chat || chat.status !== 'active') return res.json({ ok: false, reason: 'no_active_chat' });

  const specId = chat.specId;
  if (!specId) return res.json({ ok: false, reason: 'no_specialist' });

  try {
    await bot.telegram.sendMessage(specId,
      `💬 ${firstName || 'Пользователь'}: ${text}`
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Forward to specialist error:', e.message);
    res.status(500).json({ ok: false });
  }
});

// Сообщение от специалиста → пересылаем пользователю
bot.on('text', async (ctx, next) => {
  const specId = ctx.from.id;
  if (!activeSupport[specId]) return next ? next() : undefined;

  const userId = activeSupport[specId];
  const text = ctx.message.text;

  // Команда завершения
  if (text === '/end_support' || text === '/end') {
    delete activeSupport[specId];
    if (DB.supportChats?.[userId]) DB.supportChats[userId].status = 'closed';
    await ctx.reply('✅ Чат завершён.');
    // Уведомляем фронт через DB
    if (DB.supportChats?.[userId]) DB.supportChats[userId].specialistMsg = '__closed__';
    return;
  }

  // Сохраняем сообщение специалиста для фронта
  if (!DB.supportChats) DB.supportChats = {};
  if (!DB.supportChats[userId]) DB.supportChats[userId] = {};
  if (!DB.supportChats[userId].pendingMessages) DB.supportChats[userId].pendingMessages = [];
  DB.supportChats[userId].pendingMessages.push({ text, ts: Date.now() });

  await ctx.reply('✉️ Отправлено пользователю');
});

// GET /api/support/poll — фронт опрашивает есть ли новые сообщения от специалиста
app.get('/api/support/poll', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ ok: true, messages: [], status: 'ai' });

  const chat = DB.supportChats?.[userId];
  if (!chat) return res.json({ ok: true, messages: [], status: 'ai' });

  const msgs = chat.pendingMessages || [];
  chat.pendingMessages = []; // очищаем после отдачи

  const status = chat.status || 'waiting';
  res.json({ ok: true, messages: msgs, status });
});

/* ══ SERVER ══ */

// ── Миграция: добавляем uid в записи рефов у которых его нет ──
// (для старых рефералов записанных до обновления)
(function migrateRefUids() {
  let changed = false;
  for (const [ownerId, u] of Object.entries(DB.users)) {
    if (!u.refs || !u.refs.length) continue;
    for (const ref of u.refs) {
      if (!ref.uid) {
        // Ищем userId по имени/username среди всех пользователей
        const match = Object.entries(DB.users).find(([uid, du]) => {
          if (uid === ownerId) return false;
          const duName = du.username ? '@'+du.username : du.firstName;
          return duName === ref.name;
        });
        if (match) { ref.uid = match[0]; changed = true; }
      }
    }
  }
  if (changed) saveDB();
})();

/* ══════════════════════════════════════════
   ADMIN REST API — all endpoints protected
   ══════════════════════════════════════════ */
function adminCheck(req, res) {
  const uid = String(req.query.userId || req.body?.userId || '');
  const secret = req.query.secret || req.body?.secret || '';
  const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
  if (isAdmin(uid)) return true;
  if (ADMIN_SECRET && secret === ADMIN_SECRET) return true;
  res.status(403).json({ error: 'Forbidden' });
  return false;
}

app.get('/api/admin/stats', (req, res) => {
  if (!adminCheck(req, res)) return;
  const now = Date.now();
  const topUsers = Object.entries(DB.users)
    .map(([uid, u]) => ({ uid, username: u.username||'?', firstName: u.firstName||'', balance: u.balance||0 }))
    .sort((a, b) => b.balance - a.balance).slice(0, 10);
  const totalCoins = Object.values(DB.users).reduce((s, u) => s + (u.balance||0), 0);
  const vipCount = Object.values(DB.users).filter(u => u.vipExpiry && u.vipExpiry > now).length;
  const totalUsers = Object.keys(DB.users).length;
  const activeDraws = Object.values(DB.draws).filter(d => !d.finished && d.endsAt > now).length;
  res.json({
    totalUsers, users: totalUsers, draws: activeDraws, activeDraws,
    tasks: (DB.customTasks||[]).length,
    promos: Object.keys(DB.promos||{}).length,
    notifications: (DB.notifications||[]).length,
    shop: (DB.customShopItems||[]).length,
    totalCoins, vipCount,
    repairMode: DB.repairMode || false,
    topUsers, caseOpens: DB.caseOpens || {}
  });
});;

app.get('/api/admin/users', (req, res) => {
  if (!adminCheck(req, res)) return;
  const q = (req.query.q||'').toLowerCase();
  let users = Object.entries(DB.users).map(([uid, u]) => ({
    uid,
    username: u.username||'',
    firstName: u.firstName||'',
    balance: u.balance||0,
    starsBalance: u.starsBalance||0,
    regDate: u.regDate||'',
    refs: (u.refs||[]).length,
    banned: !!(DB.bans?.[u.username] || DB.bansByUid?.[uid]),
    photoUrl: u.photoUrl||null
  })).sort((a, b) => b.balance - a.balance);
  if (q) users = users.filter(u => u.username.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q));
  res.json(users);
});

app.get('/api/admin/users/:uid', (req, res) => {
  if (!adminCheck(req, res)) return;
  const uid = req.params.uid;
  const u = DB.users[uid];
  if (!u) return res.status(404).json({ error: 'User not found' });
  const now = Date.now();
  const vipActive = u.vipExpiry && u.vipExpiry > now;
  const legendActive = u.legendExpiry && u.legendExpiry > now;
  res.json({
    uid,
    username: u.username || '',
    firstName: u.firstName || '',
    balance: u.balance || 0,
    starsBalance: u.starsBalance || 0,
    regDate: u.regDate || '',
    refs: (u.refs || []).length,
    refEarned: u.refEarned || 0,
    refBy: u.refBy || null,
    vipActive: !!vipActive,
    vipExpiry: u.vipExpiry || null,
    hasCrown: !!u.hasCrown,
    legendActive: !!legendActive,
    legendColor: u.legendColor || null,
    nickColor: u.nickColor || null,
    doneTasks: (u.doneTasks || []).length,
    usedPromos: (u.usedPromos || []).length,
    inventory: u.inventory || {},
    walletAddress: u.walletAddress || null,
    banned: !!(DB.bans?.[u.username] || DB.bansByUid?.[uid]),
    transactions: (u.transactions || []).slice(0, 10),
    lastSeen: u.lastSeen || null,
  });
});

app.post('/api/admin/balance', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { targetUid, targetUsername, amount, action, reason } = req.body;
  if ((!targetUid && !targetUsername) || !amount || !action)
    return res.status(400).json({ error: 'Missing fields' });
  let targetUID = targetUid ? String(targetUid) : null;
  if (!targetUID && targetUsername) {
    const username = targetUsername.replace('@','').toLowerCase();
    for (const [uid, u] of Object.entries(DB.users)) {
      if ((u.username||'').toLowerCase() === username) { targetUID = uid; break; }
    }
    if (!targetUID) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`);
        const d = await r.json();
        if (d.ok && d.result?.id) {
          targetUID = String(d.result.id);
          const u = getUser(targetUID); u.username = username; u.firstName = d.result.first_name || '';
        }
      } catch {}
    }
  }
  if (!targetUID || !DB.users[targetUID])
    return res.status(404).json({ error: 'User not found' });
  const u = getUser(targetUID);
  const before = u.balance;
  const amt = Number(amount);
  if (action === 'add') {
    u.balance += amt; u.serverBalance = u.balance;
    addTx(targetUID, 'adjustment', `+${amt}`, reason || 'Начислено администратором');
    try { await bot.telegram.sendMessage(Number(targetUID), `💰 Администратор начислил тебе ${amt.toLocaleString('ru')} монет!\n💼 Баланс: ${u.balance.toLocaleString('ru')}`); } catch {}
  } else {
    u.balance = Math.max(0, u.balance - amt); u.serverBalance = u.balance;
    addTx(targetUID, 'adjustment', `-${amt}`, reason || 'Снято администратором');
    try { await bot.telegram.sendMessage(Number(targetUID), `⚠️ Администратор снял ${amt.toLocaleString('ru')} монет.\nПричина: ${reason||'—'}\n💼 Баланс: ${u.balance.toLocaleString('ru')}`); } catch {}
  }
  saveDB();
  res.json({ ok: true, before, after: u.balance });
});;

app.get('/api/admin/tasks', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(DB.customTasks||[]);
});

app.post('/api/admin/tasks', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { type, reward, name, desc, isNew } = req.body;
  if (!type || !reward || !name) return res.status(400).json({ error: 'Missing fields' });
  const typeRaw = type.toLowerCase();
  let check, channel, url, tag, tc;
  if (typeRaw.startsWith('sub:')) { channel = typeRaw.split(':')[1]; check='sub'; tag='Канал'; tc='g'; url=`https://t.me/${channel}`; }
  else if (typeRaw.startsWith('chat:')) { channel = typeRaw.split(':')[1]; check='chat'; tag='Чат'; tc='g'; url=`https://t.me/${channel}`; }
  else if (typeRaw==='ref') { check='ref'; tag='Друзья'; tc='g'; }
  else if (typeRaw==='case') { check='case'; tag='Задание'; tc='g'; }
  else if (typeRaw==='wallet') { check='wallet'; tag='Кошелёк'; tc='g'; }
  else return res.status(400).json({ error: 'Unknown type' });
  const nextId = ++DB.customTaskCounter;
  const task = { id: nextId, icoKey: check, tag, tc, name, desc: desc||name, rew: Number(reward), check, isNew: !!isNew };
  if (channel) { task.channel = channel; task.url = url; }
  if (!DB.customTasks) DB.customTasks = [];
  DB.customTasks.push(task);
  saveDB();
  res.json({ ok: true, task });
});

app.patch('/api/admin/tasks/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!DB.customTasks) return res.status(404).json({ error: 'No tasks' });
  const idx = DB.customTasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  const allowed = ['name', 'reward', 'desc', 'tag', 'tagText', 'isNew', 'borderColor', 'newTagColor'];
  const task = DB.customTasks[idx];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      if (k === 'reward') task.rew = req.body[k];
      else task[k] = req.body[k];
    }
  }
  saveDB();
  res.json({ ok: true, task });
});

app.delete('/api/admin/tasks/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!DB.customTasks) return res.status(404).json({ error: 'No tasks' });
  const idx = DB.customTasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  const removed = DB.customTasks.splice(idx, 1)[0];
  saveDB();
  res.json({ ok: true, removed });
});

// Static task definitions (mirrored from frontend config.js)
const STATIC_TASKS = [
  {id:1, icoKey:'sub',    tag:'Подписка', tc:'g',  name:'Подписаться на канал',     desc:'Подпишись на @broketalking и включи уведомления! (В случае отписки с баланса будет списан штраф)', rew:100,  url:'https://t.me/broketalking', check:'sub', channel:'broketalking'},
  {id:4, icoKey:'ref',    tag:'Друзья',   tc:'fr', name:'Пригласить первого друга',  desc:'Пригласи друга по своей реф-ссылке и получи монеты за каждого реферала!',                           rew:1000, check:'ref'},
  {id:6, icoKey:'case',   tag:'Задание',  tc:'o',  name:'Открыть первый кейс',       desc:'Открой любой кейс в разделе Магазин → Кейсы и получи награду!',                                     rew:200,  check:'case'},
  {id:7, icoKey:'wallet', tag:'Кошелёк',  tc:'b',  name:'Подключить TON кошелёк',    desc:'Подключи TonKeeper или Telegram Wallet в разделе Профиль и получи монеты!',                          rew:2000, check:'wallet'},
];

// Static task overrides (public read)
app.get('/api/tasks/overrides', (req, res) => {
  res.json(DB.taskOverrides || {});
});

// Static tasks list for admin (with overrides applied)
app.get('/api/admin/tasks/static', (req, res) => {
  if (!adminCheck(req, res)) return;
  const overrides = DB.taskOverrides || {};
  const tasks = STATIC_TASKS.map(t => {
    const ov = overrides[t.id] || {};
    return { ...t, ...ov, _isStatic: true };
  });
  res.json(tasks);
});

// Static task overrides (admin)
app.get('/api/admin/tasks/overrides', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(DB.taskOverrides || {});
});

app.patch('/api/admin/tasks/static/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!DB.taskOverrides) DB.taskOverrides = {};
  const allowed = ['rew', 'name', 'desc', 'tag', 'tc', 'order'];
  const current = DB.taskOverrides[id] || {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) current[k] = req.body[k];
  }
  DB.taskOverrides[id] = current;
  saveDB();
  res.json({ ok: true, override: current });
});

app.delete('/api/admin/tasks/static/:id/override', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (DB.taskOverrides) delete DB.taskOverrides[id];
  saveDB();
  res.json({ ok: true });
});

// ── STATIC SHOP ITEMS (стандартные товары конфига) ──
const STATIC_ITEMS = [
  { id: 3, name: 'VIP на 7 дней',  price: 3333, imageUrl: 'https://i.imgur.com/cMSB019.jpg' },
  { id: 7, name: 'VIP на 30 дней', price: 9999, imageUrl: 'https://i.imgur.com/2bXKYI7.jpg' },
  { id: 9, name: 'Корона на 3 дня',price: 1199, imageUrl: 'https://i.imgur.com/IDK9foe.jpg' },
  { id: 5, name: 'Цветной ник',    price: 999,  imageUrl: 'https://i.imgur.com/9CX7f2s.jpg' },
  { id: 8, name: 'Эффект входа',   price: 5000, imageUrl: 'https://i.imgur.com/HGwC5BJ.jpg' },
];

// Public endpoint — overrides for static items (used by frontend)
app.get('/api/shop/item-overrides', (req, res) => {
  res.json(DB.shopItemOverrides || {});
});

// Admin — list static items with overrides applied
app.get('/api/admin/shop/static', (req, res) => {
  if (!adminCheck(req, res)) return;
  const ovr = DB.shopItemOverrides || {};
  const items = STATIC_ITEMS.map(item => {
    const ov = ovr[item.id] || {};
    return { ...item, ...ov, _isStatic: true };
  });
  res.json(items);
});

// Admin — patch static item override
app.patch('/api/admin/shop/static/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!STATIC_ITEMS.find(i => i.id === id)) return res.status(404).json({ error: 'Not found' });
  if (!DB.shopItemOverrides) DB.shopItemOverrides = {};
  const allowed = ['name', 'price', 'tag', 'tagColor', 'borderColor', 'imageUrl'];
  const current = DB.shopItemOverrides[id] || {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) current[k] = req.body[k];
  }
  DB.shopItemOverrides[id] = current;
  saveDB();
  res.json({ ok: true, override: current });
});

// Admin — delete static item override
app.delete('/api/admin/shop/static/:id/override', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (DB.shopItemOverrides) delete DB.shopItemOverrides[id];
  saveDB();
  res.json({ ok: true });
});

app.get('/api/admin/draws', (req, res) => {
  if (!adminCheck(req, res)) return;
  const active = Object.values(DB.draws).filter(d => !d.finished);
  const finished = Object.values(DB.finished||{}).sort((a,b) => b.finishedAt - a.finishedAt);
  res.json({ active, finished });
});

app.post('/api/admin/draws', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { prize, timeMs, winnersCount, requireTicket, imageUrl } = req.body;
  if (!prize || !timeMs) return res.status(400).json({ error: 'Missing fields' });
  const ms = Math.max(10000, Number(timeMs));
  const id = ++DB.drawCounter;
  DB.draws[id] = { id, prize, endsAt: Date.now()+ms, imageUrl: imageUrl||null, participants: [], finished: false, winnersCount: Number(winnersCount)||1, requireTicket: !!requireTicket, createdAt: Date.now() };
  saveDB();
  setTimeout(() => finishDraw(id), ms);
  res.json({ ok: true, id, draw: DB.draws[id] });
});

app.patch('/api/admin/draws/:id/desc', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  draw.desc = req.body.desc||'';
  saveDB();
  res.json({ ok: true });
});

app.post('/api/admin/draws/:id/conditions', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  const { type, channel, text, name } = req.body;
  if (!draw.conditions) draw.conditions = [];
  let cond;
  if (type==='tg') { cond = { type:'tg', channel:(channel||'').replace('@',''), name: name||channel, url:`https://t.me/${(channel||'').replace('@','')}` }; }
  else if (type==='custom') { cond = { type:'custom', text: text||'' }; }
  else return res.status(400).json({ error: 'Unknown condition type' });
  draw.conditions.push(cond);
  saveDB();
  res.json({ ok: true, conditions: draw.conditions });
});

app.delete('/api/admin/draws/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!DB.draws[id]) return res.status(404).json({ error: 'Draw not found' });
  delete DB.draws[id];
  saveDB();
  res.json({ ok: true });
});

app.patch('/api/admin/draws/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  const { prize, desc, imageUrl, requireTicket } = req.body;
  if (prize !== undefined) draw.prize = prize;
  if (desc !== undefined) draw.desc = desc;
  if (imageUrl !== undefined) draw.imageUrl = imageUrl || null;
  if (requireTicket !== undefined) draw.requireTicket = !!requireTicket;
  saveDB();
  res.json({ ok: true, draw });
});

app.post('/api/admin/draws/:id/image', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image data' });
  try {
    const ext = (mimeType || 'image/jpeg').includes('png') ? 'png' : 'jpg';
    const filename = `draw_${id}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(imageBase64, 'base64'));
    draw.imageUrl = `/uploads/${filename}`;
    saveDB();
    res.json({ ok: true, imageUrl: draw.imageUrl });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// Delete finished draw
app.delete('/api/admin/draws/finished/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  if (!DB.finished || !DB.finished[id]) return res.status(404).json({ error: 'Finished draw not found' });
  delete DB.finished[id];
  saveDB();
  res.json({ ok: true });
});

// Reroll winners for active draw
app.post('/api/admin/draws/:id/reroll', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  await finishDraw(id);
  res.json({ ok: true });
});

// Extend/shorten draw end time
app.patch('/api/admin/draws/:id/time', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = DB.draws[id];
  if (!draw) return res.status(404).json({ error: 'Draw not found' });
  const { addMs } = req.body;
  if (!addMs) return res.status(400).json({ error: 'Missing addMs' });
  draw.endsAt = Math.max(Date.now() + 1000, draw.endsAt + Number(addMs));
  saveDB();
  res.json({ ok: true, endsAt: draw.endsAt });
});

// Edit finished draw
app.patch('/api/admin/draws/finished/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = parseInt(req.params.id);
  const draw = (DB.finished || {})[id];
  if (!draw) return res.status(404).json({ error: 'Finished draw not found' });
  const { prize, desc, imageUrl } = req.body;
  if (prize !== undefined) draw.prize = prize;
  if (desc !== undefined) draw.desc = desc;
  if (imageUrl !== undefined) draw.imageUrl = imageUrl || null;
  saveDB();
  res.json({ ok: true, draw });
});

app.get('/api/admin/promos', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(Object.entries(DB.promos||{}).map(([code, p]) => ({ code, ...p })));
});

app.post('/api/admin/promos', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { code, reward, maxUses, vipOnly } = req.body;
  if (!code || !reward || !maxUses) return res.status(400).json({ error: 'Missing fields' });
  const c = code.toUpperCase();
  if (!DB.promos) DB.promos = {};
  DB.promos[c] = { reward: Number(reward), maxUses: Number(maxUses), usedCount: 0, vipOnly: !!vipOnly, createdAt: Date.now() };
  saveDB();
  res.json({ ok: true, code: c });
});

app.delete('/api/admin/promos/:code', (req, res) => {
  if (!adminCheck(req, res)) return;
  const code = req.params.code.toUpperCase();
  if (!DB.promos?.[code]) return res.status(404).json({ error: 'Promo not found' });
  delete DB.promos[code];
  saveDB();
  res.json({ ok: true });
});

app.get('/api/admin/notifications', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(DB.notifications||[]);
});

app.post('/api/admin/notifications', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { type, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  if (!DB.notifications) DB.notifications = [];
  const notif = { id: Date.now(), type: type||'system', text, ts: Date.now() };
  DB.notifications.unshift(notif);
  if (DB.notifications.length > 100) DB.notifications = DB.notifications.slice(0, 100);
  saveDB();
  res.json({ ok: true, notif });
});

app.delete('/api/admin/notifications/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const id = Number(req.params.id);
  const before = (DB.notifications||[]).length;
  DB.notifications = (DB.notifications||[]).filter(n => n.id !== id);
  if (DB.notifications.length < before) { saveDB(); res.json({ ok: true }); }
  else res.status(404).json({ error: 'Not found' });
});

app.post('/api/admin/backup', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const result = await backupDBToGitHub();
  res.json({ ok: result });
});





app.post('/api/admin/broadcast', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const userIds = Object.keys(DB.users);
  let sent = 0, failed = 0;
  for (const uid of userIds) {
    try {
      await bot.telegram.sendMessage(Number(uid), text, {
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
      });
      sent++;
    } catch { failed++; }
    await new Promise(r => setTimeout(r, 50));
  }
  res.json({ ok: true, sent, failed, total: userIds.length });
});

/* ══ ADMIN: SHOP ITEMS ══ */
app.get('/api/admin/shop', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(DB.customShopItems || []);
});

app.post('/api/admin/shop', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { name, price, desc, tag, tagColor, borderColor, imageUrl } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name и price обязательны' });
  if (!DB.customShopItems) DB.customShopItems = [];
  const id = Date.now();
  const item = { id, name, price: Number(price), desc: desc||'', tag: tag||'', tagColor: tagColor||'', borderColor: borderColor||'', imageUrl: imageUrl||'' };
  DB.customShopItems.push(item);
  saveDB();
  res.json({ ok: true, item });
});

app.patch('/api/admin/shop/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  if (!DB.customShopItems) return res.status(404).json({ error: 'Not found' });
  const id = Number(req.params.id);
  const idx = DB.customShopItems.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  const { name, price, desc, tag, tagColor, borderColor, imageUrl } = req.body;
  const item = DB.customShopItems[idx];
  if (name !== undefined) item.name = name;
  if (price !== undefined) item.price = Number(price);
  if (desc !== undefined) item.desc = desc;
  if (tag !== undefined) item.tag = tag;
  if (tagColor !== undefined) item.tagColor = tagColor;
  if (borderColor !== undefined) item.borderColor = borderColor;
  if (imageUrl !== undefined) item.imageUrl = imageUrl;
  saveDB();
  res.json({ ok: true, item });
});

app.delete('/api/admin/shop/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  if (!DB.customShopItems) return res.json({ ok: true });
  const id = Number(req.params.id);
  DB.customShopItems = DB.customShopItems.filter(i => i.id !== id);
  saveDB();
  res.json({ ok: true });
});

app.post('/api/admin/shop/:id/image', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  const ext = (mimeType||'image/jpeg').split('/')[1].replace('jpeg','jpg');
  const fname = `shop_${req.params.id}_${Date.now()}.${ext}`;
  const fpath = require('path').join(__dirname, 'public', 'uploads', fname);
  require('fs').mkdirSync(require('path').join(__dirname, 'public', 'uploads'), { recursive: true });
  require('fs').writeFileSync(fpath, Buffer.from(imageBase64, 'base64'));
  const imageUrl = `/uploads/${fname}`;
  if (DB.customShopItems) {
    const id = Number(req.params.id);
    const item = DB.customShopItems.find(i => i.id === id);
    if (item) { item.imageUrl = imageUrl; saveDB(); }
  }
  res.json({ ok: true, imageUrl });
});

const PORT = process.env.PORT || 5000;


/* ══ ADMIN PANEL API — новые эндпоинты для мини-апп панели ══ */

app.post('/api/admin/repair', (req, res) => {
  if (!adminCheck(req, res)) return;
  DB.repairMode = !DB.repairMode;
  saveDB();
  res.json({ ok: true, repairMode: DB.repairMode });
});

app.post('/api/admin/vip', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { targetUid, days } = req.body;
  if (!targetUid) return res.status(400).json({ error: 'targetUid required' });
  const u = DB.users[String(targetUid)];
  if (!u) return res.status(404).json({ error: 'User not found' });
  const now = Date.now();
  if (!days || Number(days) === 0) {
    u.vipExpiry = null;
  } else {
    const base = (u.vipExpiry && u.vipExpiry > now) ? u.vipExpiry : now;
    u.vipExpiry = base + (Number(days) * 86400000);
  }
  saveDB();
  try {
    const msg = u.vipExpiry ? `👑 Вам выдан VIP на ${days} дней!` : `❌ Ваш VIP убран администратором.`;
    await bot.telegram.sendMessage(Number(targetUid), msg);
  } catch {}
  res.json({ ok: true, vipExpiry: u.vipExpiry });
});

app.post('/api/admin/ban', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { targetUid, username, duration } = req.body;
  const until = (!duration || duration === '0' || Number(duration) === 0) ? 0 : Date.now() + Number(duration);
  const banData = { until, bannedAt: Date.now() };
  const un = (username||'').replace('@','').toLowerCase();
  if (un) DB.bans[un] = banData;
  if (targetUid) DB.bansByUid[String(targetUid)] = banData;
  saveDB();
  const uid = targetUid || findUidByUsername(un);
  if (uid) {
    const durStr = until === 0 ? 'навсегда' : `до ${new Date(until).toLocaleString('ru-RU')}`;
    try { await bot.telegram.sendMessage(Number(uid), `🚫 Вы заблокированы в боте.\n⏱ Срок: ${durStr}`); } catch {}
  }
  res.json({ ok: true, until });
});

app.post('/api/admin/unban', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { targetUid, username } = req.body;
  const un = (username||'').replace('@','').toLowerCase();
  if (un) delete DB.bans[un];
  if (targetUid) delete DB.bansByUid[String(targetUid)];
  saveDB();
  const uid = targetUid || findUidByUsername(un);
  if (uid) {
    try { await bot.telegram.sendMessage(Number(uid), '✅ Ваша блокировка снята. Добро пожаловать обратно!'); } catch {}
  }
  res.json({ ok: true });
});

app.post('/api/admin/broadcast/vip', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const now = Date.now();
  const vipIds = Object.entries(DB.users).filter(([,u]) => u.vipExpiry && u.vipExpiry > now).map(([uid]) => uid);
  let sent = 0, failed = 0;
  for (const uid of vipIds) {
    try {
      await bot.telegram.sendMessage(Number(uid), '👑 ' + text, {
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть SatApp Gifts', web_app: { url: APP_URL } }]] }
      });
      sent++;
    } catch { failed++; }
    await new Promise(r => setTimeout(r, 50));
  }
  res.json({ ok: true, sent, failed, total: vipIds.length });
});

app.post('/api/admin/notify', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { type, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  if (!DB.notifications) DB.notifications = [];
  const notif = { id: Date.now(), type: type || 'system', text, ts: Date.now() };
  DB.notifications.unshift(notif);
  if (DB.notifications.length > 100) DB.notifications = DB.notifications.slice(0, 100);
  saveDB();
  res.json({ ok: true, notif });
});

app.post('/api/admin/notifications/clear', (req, res) => {
  if (!adminCheck(req, res)) return;
  DB.notifications = [];
  saveDB();
  res.json({ ok: true });
});

// ══ ACCESS CONTROL ══
app.get('/api/access/check', (req, res) => {
  const userId = String(req.query.userId || '');
  const ac = DB.accessControl || { enabled: false, whitelist: [] };
  if (!ac.enabled) return res.json({ ok: true, allowed: true });
  if (userId === '6151671553') return res.json({ ok: true, allowed: true }); // admin always allowed
  const allowed = (ac.whitelist || []).some(u => String(u.uid) === userId);
  res.json({ ok: true, allowed });
});

app.get('/api/admin/access', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(DB.accessControl || { enabled: false, whitelist: [] });
});

app.post('/api/admin/access', (req, res) => {
  if (!adminCheck(req, res)) return;
  const { enabled } = req.body;
  if (!DB.accessControl) DB.accessControl = { enabled: false, whitelist: [] };
  DB.accessControl.enabled = !!enabled;
  saveDB();
  res.json({ ok: true, accessControl: DB.accessControl });
});

app.post('/api/admin/access/users', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { uid, username, firstName } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid required' });
  if (!DB.accessControl) DB.accessControl = { enabled: false, whitelist: [] };
  if (!DB.accessControl.whitelist) DB.accessControl.whitelist = [];
  const exists = DB.accessControl.whitelist.some(u => String(u.uid) === String(uid));
  if (exists) return res.json({ ok: true, already: true });
  DB.accessControl.whitelist.push({ uid: String(uid), username: username || '', firstName: firstName || '', addedAt: Date.now() });
  saveDB();
  res.json({ ok: true });
});

app.delete('/api/admin/access/users/:uid', (req, res) => {
  if (!adminCheck(req, res)) return;
  const uid = String(req.params.uid);
  if (!DB.accessControl) return res.json({ ok: true });
  DB.accessControl.whitelist = (DB.accessControl.whitelist || []).filter(u => String(u.uid) !== uid);
  saveDB();
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

async function startServer() {
  // Сначала восстанавливаем БД из GitHub (до старта сервера)
  if (GITHUB_TOKEN) {
    try {
      await ensureDbBackupBranch();
      const restored = await restoreDBFromGitHub();
      if (!restored) console.log('ℹ️ GitHub restore: нет данных для восстановления или локальная БД актуальна');
    } catch (e) {
      console.log('⚠️ GitHub restore error:', e.message);
    }
  } else {
    console.log('ℹ️ GITHUB_PERSONAL_ACCESS_TOKEN не задан — резервное копирование отключено');
  }

  // Авто-сброс режима тех. работ при каждом деплое/рестарте
  DB.repairMode = false;
  saveDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server on port ${PORT}`);

    if (APP_URL) {
      bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`)
        .then(() => console.log('✅ Webhook set'))
        .catch(e => { console.log('Webhook error:', e.message); bot.launch(); });
    } else {
      bot.launch();
      console.log('✅ Bot polling');
    }
  });
}

startServer();

app.post(`/bot${BOT_TOKEN}`, (req, res) => { bot.handleUpdate(req.body, res); });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
