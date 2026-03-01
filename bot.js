const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6151671553;
const APP_URL = process.env.APP_URL || '';

if (!BOT_TOKEN) { console.error('BOT_TOKEN not set!'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB = {
  users: {},
  promos: {},
  draws: {},
  finished: {},
  drawCounter: 0,
  pendingDraw: {}, // временное хранение фото пока ждём команду
};

function getUser(uid) {
  uid = String(uid);
  if (!DB.users[uid]) DB.users[uid] = {
    balance: 1000, refs: [], refBy: null, refEarned: 0,
    usedPromos: [], vipExpiry: null, username: '', firstName: '',
    regDate: new Date().toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})
  };
  return DB.users[uid];
}

function isAdmin(uid) { return Number(uid) === ADMIN_ID; }
function isMoney(prize) { return /^\d+$/.test(String(prize).trim()); }

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
  const { userId, username, firstName, balance } = req.body;
  if (!userId) return res.json({ ok: false });
  const u = getUser(userId);
  if (username) u.username = username.toLowerCase();
  if (firstName) u.firstName = firstName;

  // ════════════════════════════════════════════════════════
  // ИСПРАВЛЕНИЕ: если фронт передаёт баланс при синке —
  // берём максимальный из двух (защита от потерь прогресса)
  // ════════════════════════════════════════════════════════
  if (balance !== undefined && Number(balance) > u.balance) {
    u.balance = Number(balance);
  }

  res.json({ ok: true, balance: u.balance, refs: u.refs, refEarned: u.refEarned, vipExpiry: u.vipExpiry });
});

// ════════════════════════════════════════════════════════════
// ИСПРАВЛЕНИЕ: убрали ограничение "только если больше".
// Теперь баланс всегда принимается с фронта (траты в магазине,
// открытие кейсов и т.д. корректно сохраняются на сервере).
// ════════════════════════════════════════════════════════════
app.post('/api/balance/update', (req, res) => {
  const { userId, balance } = req.body;
  if (!userId || balance === undefined) return res.json({ ok: false });
  const u = getUser(userId);
  u.balance = Number(balance);
  res.json({ ok: true, balance: u.balance });
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
      // Спрашиваем подтверждение на фронте
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
    `👋 Привет, ${ctx.from.first_name}!\n\n🎁 Добро пожаловать в GiftBot!\n💰 Баланс: ${u.balance} монет`,
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

/* ══ /cdraw — поддержка фото ══
   Telegram при отправке фото+caption передаёт это как message с photo и caption.
   Поэтому обрабатываем оба варианта: текстовое сообщение И фото с caption.
*/
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

  // Проверяем последний элемент на "билет"
  const lastEl = (timeParts[timeParts.length - 1] || '').toLowerCase();
  if (lastEl.includes('билет')) {
    requireTicket = true;
    timeParts = timeParts.slice(0, -1);
  }

  // Проверяем последний элемент на кол-во победителей
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

  // Получаем URL фото если есть
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

// Текстовая команда /cdraw (без фото)
bot.command('cdraw', (ctx) => {
  handleCdraw(ctx, ctx.message.text, null);
});

// Фото с caption /cdraw ... — это главный способ добавить картинку
bot.on('photo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const caption = ctx.message.caption || '';
  if (caption.startsWith('/cdraw')) {
    handleCdraw(ctx, caption, ctx.message.photo);
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

bot.on('message', (ctx, next) => {
  const u = getUser(ctx.from.id);
  u.username = (ctx.from.username||'').toLowerCase();
  u.firstName = ctx.from.first_name||'';
  return next();
});

/* ══ SERVER ══ */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

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