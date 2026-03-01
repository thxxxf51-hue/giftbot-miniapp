const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6151671553;
const APP_URL = process.env.APP_URL || 'https://your-app.up.railway.app';

if (!BOT_TOKEN) { console.error('BOT_TOKEN not set!'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ══════════════════════════════════════════
   IN-MEMORY DATABASE
   В продакшне замени на PostgreSQL / Redis
══════════════════════════════════════════ */
const DB = {
  users: {},      // uid → { balance, refs, usedPromos, vipExpiry, ... }
  promos: {},     // code → { reward, maxUses, usedCount, vipOnly }
  draws: {},      // id → { prize, endsAt, imageUrl, participants[] }
  drawCounter: 0,
};

function getUser(uid) {
  uid = String(uid);
  if (!DB.users[uid]) {
    DB.users[uid] = {
      balance: 1000,
      refs: [],
      refBy: null,
      refEarned: 0,
      usedPromos: [],
      vipExpiry: null,
      joinedDraws: [],
      regDate: new Date().toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' }),
    };
  }
  return DB.users[uid];
}

function isAdmin(uid) { return Number(uid) === ADMIN_ID; }

/* ══════════════════════════════════════════
   CHECK SUBSCRIPTION via Bot API
══════════════════════════════════════════ */
async function checkSub(userId, channelUsername) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channelUsername}&user_id=${userId}`
    );
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    return ['member','administrator','creator'].includes(status);
  } catch { return false; }
}

/* ══════════════════════════════════════════
   REST API для Mini App
══════════════════════════════════════════ */

// Проверка подписки
app.post('/api/check-sub', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok: false, error: 'missing params' });
  const isSub = await checkSub(userId, channel);
  res.json({ ok: true, subscribed: isSub });
});

// Проверка участия в чате (проверяем через getChatMember)
app.post('/api/check-chat', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok: false, error: 'missing params' });
  try {
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`
    );
    const data = await r.json();
    if (!data.ok) return res.json({ ok: true, member: false });
    const status = data.result?.status;
    const isMember = status && status !== 'left' && status !== 'kicked';
    res.json({ ok: true, member: isMember });
  } catch { res.json({ ok: true, member: false }); }
});

// Получить данные пользователя
app.get('/api/user/:uid', (req, res) => {
  const u = getUser(req.params.uid);
  res.json({ ok: true, user: u });
});

// Обновить баланс (только с сервера)
app.post('/api/user/:uid/sync', (req, res) => {
  const { balance, doneTasks, usedPromos, refs, refEarned, vipExpiry } = req.body;
  const u = getUser(req.params.uid);
  if (balance !== undefined) u.balance = balance;
  if (doneTasks) u.doneTasks = doneTasks;
  if (usedPromos) u.usedPromos = usedPromos;
  if (refs) u.refs = refs;
  if (refEarned !== undefined) u.refEarned = refEarned;
  if (vipExpiry !== undefined) u.vipExpiry = vipExpiry;
  res.json({ ok: true });
});

// Получить промокод
app.post('/api/promo', (req, res) => {
  const { code, userId, isVip } = req.body;
  const c = code?.toUpperCase();
  const p = DB.promos[c];
  if (!p) return res.json({ ok: false, error: 'Неверный промокод' });
  if (p.vipOnly && !isVip) return res.json({ ok: false, error: '❌ Этот промокод только для VIP' });
  if (p.usedCount >= p.maxUses) return res.json({ ok: false, error: '❌ Промокод использован максимальное число раз' });
  const u = getUser(userId);
  if (u.usedPromos.includes(c)) return res.json({ ok: false, error: '❌ Вы уже использовали этот промокод' });
  u.usedPromos.push(c);
  u.balance += p.reward;
  p.usedCount++;
  res.json({ ok: true, reward: p.reward, balance: u.balance });
});

// Получить розыгрыши
app.get('/api/draws', (req, res) => {
  const now = Date.now();
  const active = Object.values(DB.draws).filter(d => d.endsAt > now);
  res.json({ ok: true, draws: active });
});

// Реф обработка
app.post('/api/ref', (req, res) => {
  const { newUserId, refUserId } = req.body;
  const nu = getUser(newUserId);
  const ru = getUser(refUserId);
  if (nu.refBy || String(newUserId) === String(refUserId)) return res.json({ ok: false });
  nu.refBy = refUserId;
  const tgu = req.body.username ? '@'+req.body.username : (req.body.firstName || 'Пользователь');
  ru.refs.push({ name: tgu, date: new Date().toLocaleDateString('ru-RU') });
  ru.balance += 1000;
  ru.refEarned += 1000;
  if (ru.refs.length >= 3 && !ru.task3Done) { ru.balance += 2000; ru.task3Done = true; }
  res.json({ ok: true });
});

/* ══════════════════════════════════════════
   BOT COMMANDS
══════════════════════════════════════════ */
bot.start(async (ctx) => {
  const uid = ctx.from.id;
  const sp = ctx.startPayload;
  const u = getUser(uid);

  // Реф
  if (sp && sp.startsWith('ref_')) {
    const refUID = sp.replace('ref_', '');
    if (refUID !== String(uid) && !u.refBy) {
      const ru = getUser(refUID);
      u.refBy = refUID;
      const name = ctx.from.username ? '@'+ctx.from.username : ctx.from.first_name;
      ru.refs.push({ name, date: new Date().toLocaleDateString('ru-RU') });
      ru.balance += 1000;
      ru.refEarned += 1000;
      if (ru.refs.length >= 3 && !ru.task3Done) { ru.balance += 2000; ru.task3Done = true; }
      // Notify inviter
      try {
        await ctx.telegram.sendMessage(refUID,
          `🎉 По вашей ссылке зашёл ${name}!\n💰 +1000 монет начислено!`
        );
      } catch {}
    }
  }

  await ctx.reply(
    `👋 Привет, ${ctx.from.first_name}!\n\n🎁 Добро пожаловать в GiftBot!\n💰 На балансе: ${u.balance} монет\n\nНажми кнопку ниже чтобы открыть приложение:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🎁 Открыть GiftBot', web_app: { url: APP_URL } }
        ]]
      }
    }
  );
});

/* ── ADMIN: создать промокод ── */
// /cpromo КОД СУММА КОЛИЧЕСТВО
bot.command('cpromo', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Формат: /cpromo КОД СУММА КОЛИЧЕСТВО\nПример: /cpromo SUPER100 100 50');
  const [, code, reward, maxUses] = parts;
  DB.promos[code.toUpperCase()] = { reward: Number(reward), maxUses: Number(maxUses), usedCount: 0, vipOnly: false };
  ctx.reply(`✅ Промокод создан!\nКод: ${code.toUpperCase()}\nНаграда: ${reward} монет\nАктиваций: ${maxUses}`);
});

/* ── ADMIN: VIP промокод ── */
// /vpromo КОД СУММА КОЛИЧЕСТВО
bot.command('vpromo', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 4) return ctx.reply('Формат: /vpromo КОД СУММА КОЛИЧЕСТВО');
  const [, code, reward, maxUses] = parts;
  DB.promos[code.toUpperCase()] = { reward: Number(reward), maxUses: Number(maxUses), usedCount: 0, vipOnly: true };
  ctx.reply(`✅ VIP-промокод создан!\nКод: ${code.toUpperCase()}\nНаграда: ${reward} монет\nТолько для VIP ✨`);
});

/* ── ADMIN: создать розыгрыш ── */
// /cdraw ПРИЗ ВРЕМЯ (например: /cdraw 1000 1 час)
bot.command('cdraw', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text;
  const parts = text.replace('/cdraw ', '').split(' ');
  if (parts.length < 2) return ctx.reply('Формат: /cdraw ПРИЗ ВРЕМЯ\nПример: /cdraw 1000 1 час\nИли: /cdraw iPhone17 2 дня\n\nМожно прикрепить картинку!');

  const prize = parts[0];
  const timeStr = parts.slice(1).join(' ');
  let ms = 0;
  if (timeStr.includes('мин')) ms = parseInt(timeStr) * 60000;
  else if (timeStr.includes('час')) ms = parseInt(timeStr) * 3600000;
  else if (timeStr.includes('ден') || timeStr.includes('дн') || timeStr.includes('день')) ms = parseInt(timeStr) * 86400000;
  else ms = parseInt(timeStr) * 3600000; // default hours
  if (!ms || ms <= 0) ms = 3600000;

  const id = ++DB.drawCounter;
  const endsAt = Date.now() + ms;
  let imageUrl = null;

  // Check for photo
  if (ctx.message.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
    const fileData = await fileRes.json();
    if (fileData.ok) imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
  }

  DB.draws[id] = { id, prize, endsAt, imageUrl, participants: [], createdAt: Date.now() };

  const timeLeft = timeStr;
  ctx.reply(`✅ Розыгрыш создан!\n🏆 Приз: ${prize}\n⏱ Длится: ${timeLeft}\n🆔 ID: ${id}${imageUrl ? '\n🖼 С картинкой' : ''}`);

  // Auto-finish when time expires
  setTimeout(async () => {
    const draw = DB.draws[id];
    if (!draw || draw.finished) return;
    draw.finished = true;
    if (!draw.participants.length) {
      try { await ctx.telegram.sendMessage(ADMIN_ID, `🎁 Розыгрыш #${id} (приз: ${prize}) завершён — участников не было.`); } catch {}
      return;
    }
    const winner = draw.participants[Math.floor(Math.random() * draw.participants.length)];
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, `🎉 Победитель розыгрыша #${id} (${prize}):\nID: ${winner.uid}\nИмя: ${winner.name}`);
    } catch {}
  }, ms);
});

/* ── ADMIN: выдать монеты ── */
// /pgive @username СУММА
bot.command('pgive', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Формат: /pgive @username СУММА');
  const username = parts[1].replace('@', '');
  const amount = Number(parts[2]);
  if (!amount || amount <= 0) return ctx.reply('Неверная сумма');

  // Find user by username
  let targetUID = null;
  for (const [uid, u] of Object.entries(DB.users)) {
    if (u.username === username) { targetUID = uid; break; }
  }
  if (!targetUID) return ctx.reply(`❌ Пользователь @${username} не найден. Он должен был хотя бы раз запустить бота.`);

  DB.users[targetUID].balance += amount;
  try {
    await ctx.telegram.sendMessage(targetUID, `💰 Администратор начислил вам ${amount} монет!\nНовый баланс: ${DB.users[targetUID].balance}`);
  } catch {}
  ctx.reply(`✅ Выдано ${amount} монет пользователю @${username}\nНовый баланс: ${DB.users[targetUID].balance}`);
});

/* ── Список промокодов (только admin) ── */
bot.command('promos', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = Object.entries(DB.promos).map(([code, p]) =>
    `• ${code}: ${p.reward}🪙, ${p.usedCount}/${p.maxUses} исп.${p.vipOnly ? ' [VIP]' : ''}`
  ).join('\n');
  ctx.reply(list ? `📋 Промокоды:\n${list}` : 'Промокодов нет');
});

/* ── Список розыгрышей (только admin) ── */
bot.command('draws', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const now = Date.now();
  const list = Object.values(DB.draws).filter(d => !d.finished).map(d => {
    const left = Math.round((d.endsAt - now) / 60000);
    return `• #${d.id}: ${d.prize}, ${d.participants.length} уч., осталось ~${left} мин`;
  }).join('\n');
  ctx.reply(list ? `🎁 Активные розыгрыши:\n${list}` : 'Нет активных розыгрышей');
});

// Сохранять username при каждом сообщении
bot.on('message', (ctx, next) => {
  const u = getUser(ctx.from.id);
  u.username = ctx.from.username || '';
  u.firstName = ctx.from.first_name || '';
  return next();
});

/* ══════════════════════════════════════════
   SERVE FRONTEND
══════════════════════════════════════════ */
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server on port ${PORT}`);
  // Set webhook
  if (process.env.APP_URL) {
    try {
      await bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`);
      console.log('Webhook set');
    } catch (e) { console.log('Webhook error:', e.message); }
  } else {
    bot.launch();
    console.log('Bot polling started');
  }
});

// Webhook endpoint
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));