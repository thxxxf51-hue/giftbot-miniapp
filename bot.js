const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');

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
  users: _saved?.users || {},
  promos: _saved?.promos || {},
  draws: _saved?.draws || {},
  finished: _saved?.finished || {},
  drawCounter: _saved?.drawCounter || 0,
  pendingDraw: _saved?.pendingDraw || {},
  starsInvoices: _saved?.starsInvoices || {},
  invoiceCounter: _saved?.invoiceCounter || 0,
  bans: _saved?.bans || {},
  bansByUid: _saved?.bansByUid || {},
  pvp: _saved?.pvp || { game: null, history: [] },
};

// Автосохранение каждые 30 секунд
setInterval(saveDB, 30000);

// Сохранение при завершении процесса
process.on('SIGTERM', () => { saveDB(); process.exit(0); });
process.on('SIGINT', () => { saveDB(); process.exit(0); });

function getUser(uid) {
  uid = String(uid);
  if (!DB.users[uid]) DB.users[uid] = {
    balance: 1000,
    starsBalance: 0,
    refs: [],
    refBy: null,
    refEarned: 0,
    usedPromos: [],
    vipExpiry: null,
    username: '',
    firstName: '',
    regDate: new Date().toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})
  };
  // Убедимся что starsBalance существует у старых юзеров
  if (DB.users[uid].starsBalance === undefined) DB.users[uid].starsBalance = 0;
  return DB.users[uid];
}

function isAdmin(uid) { return Number(uid) === ADMIN_ID; }
function isMoney(prize) { return /^\d+$/.test(String(prize).trim()); }

/* ══ HELPERS ══ */

function findUidByUsername(username) {
  username = username.replace(/^@/, '').toLowerCase();
  return Object.keys(DB.users).find(uid => (DB.users[uid].username||'').toLowerCase() === username) || null;
}

function resetUserStats(uid) {
  uid = String(uid);
  const u = DB.users[uid];
  if (!u) return false;
  const stars = u.starsBalance || 0;
  DB.users[uid] = {
    balance: 0,
    starsBalance: stars,
    refs: u.refs || [],
    refBy: u.refBy || null,
    refEarned: u.refEarned || 0,
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
    task3refsDone: false,
    resetAt: Date.now(),
  };
  return true;
}

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

function parseBanDuration(str) {
  if (!str || str === '0') return 0;
  str = str.toLowerCase().trim();
  const map = {
    'мин':60, 'минут':60, 'минута':60, 'минуты':60, 'min':60,
    'час':3600, 'часа':3600, 'часов':3600, 'hour':3600, 'h':3600,
    'день':86400, 'дня':86400, 'дней':86400, 'day':86400, 'd':86400,
    'неделя':604800, 'недели':604800, 'недель':604800, 'week':604800, 'w':604800,
    'год':31536000, 'года':31536000, 'лет':31536000, 'year':31536000, 'y':31536000,
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

  for (const winner of winners) {
    if (moneyPrize) {
      const u = getUser(winner.uid);
      u.balance += amountEach;
      try {
        await bot.telegram.sendMessage(Number(winner.uid),
          `🎉 Ты победил в розыгрыше!\n🏆 Приз: ${amountEach} монет\n\n💰 Добавлено на ваш баланс!`
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

app.post('/api/user/sync', (req, res) => {
  const { userId, username, firstName, balance, starsBalance } = req.body;
  if (!userId) return res.json({ ok: false });
  const u = getUser(userId);
  if (username) u.username = username.toLowerCase();
  if (firstName) u.firstName = firstName;
  u.lastSeen = Date.now();

  if (username) {
    const un = username.replace(/^@/, '').toLowerCase();
    if (DB.bans[un] && !DB.bansByUid[String(userId)]) {
      DB.bansByUid[String(userId)] = DB.bans[un];
    }
  }

  const ban = isBanned(userId, username);
  if (ban) {
    return res.json({ ok: true, banned: true, banUntil: ban.until, balance: u.balance, starsBalance: u.starsBalance });
  }

  const wasReset = u.resetAt ? u.resetAt : null;
  if (wasReset) {
    delete u.resetAt;
    saveDB();
    return res.json({ ok: true, reset: true, resetAt: wasReset, balance: u.balance, starsBalance: u.starsBalance });
  }

  if (balance !== undefined && Number(balance) > u.balance) {
    u.balance = Number(balance);
  }
  if (starsBalance !== undefined && Number(starsBalance) > u.starsBalance) {
    u.starsBalance = Number(starsBalance);
  }

  saveDB();
  res.json({ ok: true, balance: u.balance, starsBalance: u.starsBalance, refs: u.refs, refEarned: u.refEarned, vipExpiry: u.vipExpiry });
});

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
  res.json({ ok: true, reward: p.reward, balance: u.balance });
});

/* ══ STARS PAYMENT API ══ */

app.post('/api/stars/create-invoice', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || Number(amount) < 1) {
    return res.json({ ok: false, error: 'Неверные параметры' });
  }
  const stars = Math.floor(Number(amount));
  if (stars > 99999) return res.json({ ok: false, error: 'Максимум 99 999 Stars за раз' });
  try {
    const apiRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '⭐ Пополнение Stars',
        description: `Зачисление ${stars} Stars на баланс GiftBot`,
        payload: JSON.stringify({ userId: String(userId), amount: stars }),
        currency: 'XTR',
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

app.post('/api/stars/check', (req, res) => {
  const { userId, invoiceId, amount } = req.body;
  if (!userId) return res.json({ ok: false, error: 'Не авторизован' });
  if (invoiceId) {
    const inv = DB.starsInvoices[invoiceId];
    if (!inv) return res.json({ ok: false, error: 'Счёт не найден' });
    if (String(inv.userId) !== String(userId)) return res.json({ ok: false, error: 'Доступ запрещён' });

    if (inv.paid) {
      const u = getUser(userId);
      return res.json({ ok: true, credited: true, starsBalance: u.starsBalance, amount: inv.amount });
    }
    return res.json({ ok: true, pending: true });
  }
  return res.json({ ok: false, error: 'invoiceId обязателен' });
});

/* ══ Обработка успешной оплаты Stars ══ */
bot.on('pre_checkout_query', async (ctx) => {
  try { await ctx.answerPreCheckoutQuery(true); } catch (e) { console.error('pre_checkout error:', e); }
});

bot.on('message', async (ctx, next) => {
  if (ctx.message?.successful_payment) {
    const payment = ctx.message.successful_payment;
    try {
      const payload = JSON.parse(payment.invoice_payload);
      const userId = String(payload.userId);
      const stars = Number(payload.amount);
      const u = getUser(userId);
      u.starsBalance = (u.starsBalance || 0) + stars;

      for (const inv of Object.values(DB.starsInvoices)) {
        if (String(inv.userId) === userId && inv.amount === stars && !inv.paid) {
          const age = Date.now() - inv.createdAt;
          if (age < 3600000) {
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

app.get('/api/health', (req, res) => res.json({ ok: true, users: Object.keys(DB.users).length }));

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
      ru.refs.push({ name, date: new Date().toLocaleDateString('ru-RU') });
      ru.balance += 1000; ru.refEarned += 1000;
      if (ru.refs.length >= 3 && !ru.task3Done) {
        ru.balance += 2000; ru.task3Done = true;
        try { await ctx.telegram.sendMessage(refUID, `🎉 Бонус! 3 реферала — +2000 монет!\n💼 Баланс: ${ru.balance}`); } catch {}
      } else {
        try { await ctx.telegram.sendMessage(refUID, `🎉 По твоей ссылке зашёл ${name}!\n💰 +1000 монет!\n💼 Баланс: ${ru.balance}`); } catch {}
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

bot.command('cdraw', (ctx) => handleCdraw(ctx, ctx.message.text, null));

bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const caption = ctx.message.caption || '';

  if (caption.startsWith('/cdraw')) {
    handleCdraw(ctx, caption, ctx.message.photo);
    return;
  }

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
  try {
    await ctx.telegram.sendMessage(Number(targetUID),
      `💰 Администратор начислил тебе ${amount.toLocaleString('ru')} монет!\n💼 Баланс: ${u.balance.toLocaleString('ru')}`
    );
  } catch {}
  ctx.reply(`✅ @${username} получил ${amount.toLocaleString('ru')} монет\n💼 Баланс: ${u.balance.toLocaleString('ru')}`);
});

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
  if (!targetUID) return ctx.reply('❌ @${username} не найден. Попроси написать /start.');
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

bot.command('promos', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = Object.entries(DB.promos)
    .map(([c, p]) => `• ${c}: +${p.reward}🪙 ${p.usedCount}/${p.maxUses}${p.vipOnly ? ' 👑' : ''}`)
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
  const stars = u.starsBalance||0;

  let vipStr = '❌ Нет';
  if (u.vipExpiry && u.vipExpiry > now) {
    const daysLeft = Math.ceil((u.vipExpiry - now) / 86400000);
    vipStr = `✅ Активен (${daysLeft} дн. осталось)`;
  }

  let lastSeen = '—';
  if (u.lastSeen) {
    const d = new Date(u.lastSeen);
    const diff = now - u.lastSeen;
    const mins = Math.floor(diff/60000);
    const hours = Math.floor(diff/3600000);
    const days = Math.floor(diff/86400000);
    let timeStr = 'только что';
    if (days > 0) timeStr = `${days}д назад`;
    else if (hours > 0) timeStr = `${hours}ч назад`;
    else if (mins > 0) timeStr = `${mins}м назад`;
    lastSeen = `${d.toLocaleDateString('ru')} ${d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} (${timeStr})`;
  }

  let regDate = '—';
  if (u.regDate) regDate = new Date(u.regDate).toLocaleDateString('ru');

  const hasCrown = u.hasCrown ? '👑 Есть' : '—';
  let legendStr = '—';
  if (u.legendExpiry && u.legendExpiry > now) {
    const ld = Math.ceil((u.legendExpiry - now) / 86400000);
    legendStr = `✨ Активна (${ld} дн.)`;
  }

  const msg = 
`👤 Профиль @${username}

💰 Баланс: ${balance} монет
⭐ Stars: ${stars}
👑 VIP: ${vipStr}
✨ Легенда: ${legendStr}
${hasCrown !== '—' ? '👑 Корона: Есть\n' : ''}📅 Зарегистрирован: ${regDate}
🕐 Последний вход: ${lastSeen}
🆔 UID: ${uid}`;

  ctx.reply(msg);
});

bot.command('dstats', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const uids = Object.keys(DB.users);
  if (!uids.length) return ctx.reply('❌ Нет пользователей в базе');
  const msg = await ctx.reply(`⚠️ Сбросить статистику ВСЕХ ${uids.length} пользователей?\n\nБудет сброшено: баланс, VIP, инвентарь, корона, легенда, задания.\n⭐ Stars не тронутся.\n\nОтвет: да / нет`);
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

  const uid = findUidByUsername(username);
  if (uid) DB.bansByUid[uid] = banData;
  saveDB();

  const untilStr = until === 0 ? '🔴 Навсегда' : `до ${new Date(until).toLocaleString('ru-RU')}`;
  const durationStr = until === 0 ? 'навсегда' : formatDuration(until);

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
    (uid ? `👤 UID найден: ${uid}\n` : '⚠️ Пользователь ещё не в базе — бан применится при первом входе\n') +
    `Разбанить: /unban @${username}`
  );
});

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
  saveDB();
  res.json({ ok: true, starsBalance: u.starsBalance, balance: u.balance, coins: amt * 100 });
});

/* ══ PvP WHEEL ══ */
const PVP_COLORS = ['#2ecc71','#e74c3c','#5b8def','#f39c12','#9b59b6','#1abc9c','#e67e22','#ff6fb7','#00e5ff','#f4c430'];
const PVP_MIN_BET = 50;
const PVP_MAX_PLAYERS = 10;
const PVP_FILL_MS = 20000;
const PVP_COUNTDOWN_MS = 5000;
const PVP_SPIN_MS = 5000;

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

  const total = g.players.reduce((s, p) => s + p.bet, 0);
  let rand = Math.random() * total;
  let winner = g.players[g.players.length - 1];
  for (const p of g.players) { rand -= p.bet; if (rand <= 0) { winner = p; break; } }
  g.winner = winner;

  const u = DB.users[winner.uid];
  if (u) { u.balance += total; }
  saveDB();

  pvpTimer = setTimeout(() => {
    if (DB.pvp.game) {
      const doneGame = DB.pvp.game;
      doneGame.state = 'done';
      if (doneGame.winner) {
        DB.pvp.history.unshift({
          id: doneGame.id,
          time: Date.now(),
          players: doneGame.players.length,
          totalBet: doneGame.totalBet,
          winnerName: doneGame.winner.username ? '@'+doneGame.winner.username : doneGame.winner.firstName,
          winnerUid: doneGame.winner.uid,
        });
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

/* ══ AVATAR PROXY ══ */
app.get('/api/avatar', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://')) return res.status(400).end();
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(404).end();
    const buf = await r.arrayBuffer();
    const ct = r.headers.get('content-type') || 'image/jpeg';
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
  DB.pvp.history = (DB.pvp.history || []).filter(h => Date.now() - h.time < 3600000);
  res.json({ ok: true, history: DB.pvp.history });
});

/* ══ SERVER ══ */
app.get('', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ Server on port ${PORT}`);
  if (APP_URL) {
    try {
      await bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`);
      console.log('✅ Webhook set');
    } catch (e) {
      console.log('Webhook error:', e.message);
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