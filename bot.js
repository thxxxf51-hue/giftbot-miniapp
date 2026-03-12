const { Telegraf } = require('telegraf');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6151671553;
const APP_URL = process.env.APP_URL || '';

if (!BOT_TOKEN) { console.error('BOT_TOKEN not set!'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ══ PERSISTENT DB ══ */
const DB_FILE = path.join(__dirname, 'db.json');

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
  repairMode: false,
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
  notifyOpen:    _saved?.notifyOpen    ?? true, // уведомления о входе в приложение
  notifications: _saved?.notifications || [], // push уведомления от админа
};

// Автосохранение каждые 30 секунд
setInterval(saveDB, 30000);

// Сохранение при завершении процесса
process.on('SIGTERM', () => { saveDB(); process.exit(0); });
process.on('SIGINT',  () => { saveDB(); process.exit(0); });


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

  // Если был сброс — говорим клиенту очистить localStorage
  const wasReset = u.resetAt ? u.resetAt : null;
  if (wasReset) {
    // Сбрасываем флаг чтобы не сбрасывать повторно
    delete u.resetAt;
    saveDB();
    return res.json({ ok: true, reset: true, resetAt: wasReset, balance: u.balance, starsBalance: u.starsBalance });
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
        description: `Зачисление ${stars} Stars на баланс GiftBot`,
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
      requireTicket: d.requireTicket || false
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
  res.json({ ok: true, count: draw.participants.length });
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



// GET /api/notifications — fetch notifications for user (unread first, max 50)
app.get('/api/notifications', function(req, res) {
  const notifs = (DB.notifications || []).slice().reverse().slice(0, 50);
  res.json({ notifications: notifs });
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



app.get('/api/repair-status', function(req, res) {
  res.json({ repairMode: DB.repairMode || false });
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
  await ctx.reply(
    `👋 Привет, ${ctx.from.first_name}!\n\n🎁 Добро пожаловать в GiftBot!\n💰 Баланс: ${u.balance} монет\n⭐ Stars: ${u.starsBalance}`,
    { reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }]] } }
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
    '📎 Чтобы добавить картинку — прикрепи фото и напиши команду в подписи к фото (caption)'
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
          reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }]] }
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
            text: '🎁 Открыть GiftBot',
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

// /send ТЕКСТ — добавить уведомление в приложение (видят все пользователи)
bot.command('send', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text.replace('/send', '').trim();
  if (!text) return ctx.reply('Формат: /send ТЕКСТ\n\nПример:\n/send Новый турнир! Участвуй прямо сейчас');
  if (!DB.notifications) DB.notifications = [];
  const notif = { id: Date.now(), text, ts: Date.now() };
  DB.notifications.unshift(notif);
  if (DB.notifications.length > 100) DB.notifications = DB.notifications.slice(0, 100);
  saveDB();
  ctx.reply('✅ Уведомление отправлено!\n\n❕ ' + text + '\n\n👥 Увидят все пользователи при следующем опросе (до 30 сек)');
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
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }]] }
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
        reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }]] }
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
        `🚫 Вы заблокированы в GiftBot.\n\n` +
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
    bot.telegram.sendMessage(Number(uid), `✅ Ваш бан снят! Добро пожаловать обратно в GiftBot.`, {
      reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }]] }
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
  DB.repairMode = !DB.repairMode;
  saveDB();
  const status = DB.repairMode
    ? '🔧 Режим тех. работ ВКЛЮЧЁН. Приложение недоступно для пользователей.'
    : '✅ Тех. работы ВЫКЛЮЧЕНЫ. Приложение снова доступно.';
  ctx.reply(status);
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

  // Credit winner
  const u = DB.users[winner.uid];
  if (u) { u.balance += total; }
  saveDB();

  pvpTimer = setTimeout(() => {
    if (DB.pvp.game) {
      const doneGame = DB.pvp.game;
      doneGame.state = 'done';
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

const SUPPORT_SYS = `Ты — дружелюбный помощник поддержки Telegram-бота GiftBot. Отвечай на ЛЮБЫЕ вопросы по-русски, кратко (2–4 предложения).

О боте GiftBot:
- Telegram-бот для игр на монеты (внутренняя валюта)
- Игры: Соло (открытие подарков), Дуэль (PvP 1v1), Мины (поле 5×5 — открывай клетки, избегай мин, забирай множитель)
- Монеты пополняются через Telegram Stars. Stars покупают прямо в Telegram
- Рефералы: приглашай друзей по реферальной ссылке → бонусные монеты
- Топ выигрышей: лучшие победы за последние 24ч, порог для попадания — 30 000 монет
- Вывод Stars — через раздел Профиль
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

  const systemPrompt = `Ты — дружелюбный помощник поддержки GiftBot. Отвечай ТОЛЬКО на русском языке, никогда не используй другие языки. Пиши кратко (2–4 предложения). Отвечай на ЛЮБЫЕ вопросы.\n\nО GiftBot:\n- Игры на монеты: Соло, Дуэль (PvP), Мины (5×5)\n- Монеты — через Telegram Stars\n- Рефералы: приглашай → бонусы\n- Топ выигрышей за 24ч (от 30 000 монет)\n${userContext}\nВ конце КАЖДОГО ответа обязательно пиши ТОЧНО эту фразу (без изменений и опечаток): "Если ответ не помог — напишите «вызвать специалиста»"`;

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
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ Server on port ${PORT}`);
  if (APP_URL) {
    try {
      await bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`);
      console.log('✅ Webhook set');
    } catch (e) {
      console.log('Webhook error:', e.message);

;



bot.launch();
    }
  } else {
    bot.launch();
    console.log('✅ Bot polling');
  }
});

app.post(`/bot${BOT_TOKEN}`, (req, res) => { bot.handleUpdate(req.body, res); });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
