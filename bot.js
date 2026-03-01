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

const DB = { users:{}, promos:{}, draws:{}, drawCounter:0 };

function getUser(uid) {
  uid = String(uid);
  if (!DB.users[uid]) DB.users[uid] = { balance:1000, refs:[], refBy:null, refEarned:0, usedPromos:[], vipExpiry:null, username:'', firstName:'', regDate:new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}) };
  return DB.users[uid];
}
function isAdmin(uid) { return Number(uid) === ADMIN_ID; }

async function checkSub(userId, channel) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`);
    const d = await r.json();
    return d.ok && ['member','administrator','creator'].includes(d.result?.status);
  } catch { return false; }
}
async function checkMember(userId, channel) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${channel}&user_id=${userId}`);
    const d = await r.json();
    const s = d.result?.status;
    return d.ok && s && s !== 'left' && s !== 'kicked';
  } catch { return false; }
}

/* ══ API ══ */

// Синхронизация при старте Mini App — регистрирует юзера и отдаёт его данные
app.post('/api/user/sync', (req, res) => {
  const { userId, username, firstName } = req.body;
  if (!userId) return res.json({ ok:false });
  const u = getUser(userId);
  if (username) u.username = username.toLowerCase();
  if (firstName) u.firstName = firstName;
  res.json({ ok:true, balance:u.balance, refs:u.refs, refEarned:u.refEarned, vipExpiry:u.vipExpiry });
});

app.post('/api/check-sub', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok:false });
  res.json({ ok:true, subscribed: await checkSub(userId, channel) });
});

app.post('/api/check-chat', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) return res.json({ ok:false });
  res.json({ ok:true, member: await checkMember(userId, channel) });
});

app.post('/api/promo', (req, res) => {
  const { code, userId, isVip } = req.body;
  const c = (code||'').toUpperCase().trim();
  if (!c || !userId) return res.json({ ok:false, error:'❌ Неверный запрос' });
  const p = DB.promos[c];
  if (!p) return res.json({ ok:false, error:'❌ Неверный промокод' });
  if (p.vipOnly && !isVip) return res.json({ ok:false, error:'❌ Промокод только для VIP' });
  if (p.usedCount >= p.maxUses) return res.json({ ok:false, error:'❌ Промокод больше недоступен' });
  const u = getUser(userId);
  if (u.usedPromos.includes(c)) return res.json({ ok:false, error:'❌ Вы уже использовали этот промокод' });
  u.usedPromos.push(c);
  u.balance += p.reward;
  p.usedCount++;
  res.json({ ok:true, reward:p.reward, balance:u.balance });
});

// Получить активные розыгрыши
app.get('/api/draws', (req, res) => {
  const now = Date.now();
  const active = Object.values(DB.draws)
    .filter(d => !d.finished && d.endsAt > now)
    .map(d => ({ id:d.id, prize:d.prize, endsAt:d.endsAt, imageUrl:d.imageUrl, participantsCount:d.participants.length }));
  res.json({ ok:true, draws:active });
});

// Участвовать в розыгрыше
app.post('/api/draws/join', (req, res) => {
  const { drawId, userId, username, firstName } = req.body;
  const draw = DB.draws[drawId];
  if (!draw || draw.finished || draw.endsAt < Date.now()) return res.json({ ok:false, error:'Розыгрыш не найден' });
  if (draw.participants.find(p => String(p.uid) === String(userId))) return res.json({ ok:false, error:'Уже участвуете' });
  draw.participants.push({ uid:userId, name:username?'@'+username:firstName });
  res.json({ ok:true, count:draw.participants.length });
});

app.get('/api/health', (req, res) => res.json({ ok:true, users:Object.keys(DB.users).length, promos:Object.keys(DB.promos).length }));

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
      ru.refs.push({ name, date:new Date().toLocaleDateString('ru-RU') });
      ru.balance += 1000; ru.refEarned += 1000;
      if (ru.refs.length >= 3 && !ru.task3Done) { ru.balance += 2000; ru.task3Done = true; try { await ctx.telegram.sendMessage(refUID, `🎉 Бонус! 3 реферала — +2000 монет!\n💼 Баланс: ${ru.balance}`); } catch {} }
      else { try { await ctx.telegram.sendMessage(refUID, `🎉 По твоей ссылке зашёл ${name}!\n💰 +1000 монет!\n💼 Баланс: ${ru.balance}`); } catch {} }
    }
  }
  await ctx.reply(`👋 Привет, ${ctx.from.first_name}!\n\n🎁 Добро пожаловать в GiftBot!\n💰 Баланс: ${u.balance} монет`,
    { reply_markup:{ inline_keyboard:[[{ text:'🎁 Открыть GiftBot', web_app:{ url:APP_URL } }]] } });
});

// /cpromo КОД СУММА КОЛ-ВО
bot.command('cpromo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const p = ctx.message.text.split(' ');
  if (p.length < 4) return ctx.reply('Формат: /cpromo КОД СУММА КОЛ-ВО\nПример: /cpromo SUMMER500 500 100');
  const c = p[1].toUpperCase();
  DB.promos[c] = { reward:Number(p[2]), maxUses:Number(p[3]), usedCount:0, vipOnly:false };
  ctx.reply(`✅ Промокод создан!\n📌 Код: ${c}\n💰 Награда: ${p[2]} монет\n🔢 Активаций: ${p[3]}`);
});

// /vpromo КОД СУММА КОЛ-ВО
bot.command('vpromo', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const p = ctx.message.text.split(' ');
  if (p.length < 4) return ctx.reply('Формат: /vpromo КОД СУММА КОЛ-ВО');
  const c = p[1].toUpperCase();
  DB.promos[c] = { reward:Number(p[2]), maxUses:Number(p[3]), usedCount:0, vipOnly:true };
  ctx.reply(`✅ VIP-промокод создан!\n📌 Код: ${c}\n💰 Награда: ${p[2]} монет\n👑 Только для VIP`);
});

// /cdraw ПРИЗ ВРЕМЯ
bot.command('cdraw', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const text = ctx.message.text.replace('/cdraw','').trim();
  const parts = text.split(' ');
  if (parts.length < 2) return ctx.reply('Формат: /cdraw ПРИЗ ВРЕМЯ\nПримеры:\n/cdraw 1000 1 минута\n/cdraw iPhone 2 часа\n/cdraw PS5 1 день\n\n(Можно прикрепить картинку!)');
  const prize = parts[0];
  const timeStr = parts.slice(1).join(' ');
  const num = parseInt(timeStr)||1;
  let ms = timeStr.includes('мин') ? num*60000 : timeStr.includes('час') ? num*3600000 : num*86400000;
  if (ms <= 0) ms = 60000;
  const id = ++DB.drawCounter;
  let imageUrl = null;
  if (ctx.message.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length-1];
    try { const fr = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${photo.file_id}`); const fd = await fr.json(); if(fd.ok) imageUrl=`https://api.telegram.org/file/bot${BOT_TOKEN}/${fd.result.file_path}`; } catch {}
  }
  DB.draws[id] = { id, prize, endsAt:Date.now()+ms, imageUrl, participants:[], finished:false };
  ctx.reply(`✅ Розыгрыш #${id} создан!\n🏆 Приз: ${prize}\n⏱ Длится: ${timeStr}\n📱 Уже отображается в приложении!${imageUrl?'\n🖼 С картинкой':''}`);
  setTimeout(async () => {
    const draw = DB.draws[id];
    if (!draw||draw.finished) return;
    draw.finished = true;
    if (!draw.participants.length) { try { await bot.telegram.sendMessage(ADMIN_ID, `🎁 Розыгрыш #${id} (${prize}) завершён — участников не было.`); } catch {} return; }
    const winner = draw.participants[Math.floor(Math.random()*draw.participants.length)];
    try { await bot.telegram.sendMessage(ADMIN_ID, `🎉 Победитель #${id} (${prize}):\nID: ${winner.uid}\nИмя: ${winner.name}`); } catch {}
    try { await bot.telegram.sendMessage(Number(winner.uid), `🎉 Ты победил в розыгрыше!\n🏆 Приз: ${prize}\nАдминистратор скоро свяжется!`); } catch {}
  }, ms);
});

// /pgive @username СУММА
bot.command('pgive', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Формат: /pgive @username СУММА');
  const username = parts[1].replace('@','').toLowerCase();
  const amount = Number(parts[2]);
  if (!amount || amount <= 0) return ctx.reply('❌ Неверная сумма');
  let targetUID = null;
  // Ищем в базе
  for (const [uid, u] of Object.entries(DB.users)) {
    if (u.username === username) { targetUID = uid; break; }
  }
  // Если нет — пробуем Telegram API
  if (!targetUID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`);
      const d = await r.json();
      if (d.ok && d.result?.id) { targetUID = String(d.result.id); const u = getUser(targetUID); u.username = username; u.firstName = d.result.first_name||''; }
    } catch {}
  }
  if (!targetUID) return ctx.reply(`❌ @${username} не найден.\nПопроси его написать /start боту и повтори.`);
  const u = getUser(targetUID);
  u.balance += amount;
  try { await ctx.telegram.sendMessage(Number(targetUID), `💰 Администратор начислил тебе ${amount.toLocaleString('ru')} монет!\n💼 Баланс: ${u.balance.toLocaleString('ru')}`); } catch {}
  ctx.reply(`✅ @${username} получил ${amount.toLocaleString('ru')} монет\n💼 Баланс: ${u.balance.toLocaleString('ru')}`);
});

bot.command('promos', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const list = Object.entries(DB.promos).map(([c,p]) => `• ${c}: +${p.reward}🪙  ${p.usedCount}/${p.maxUses}${p.vipOnly?' 👑':''}`).join('\n');
  ctx.reply(list ? `📋 Промокоды:\n\n${list}` : 'Промокодов нет');
});

bot.command('draws', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const now = Date.now();
  const list = Object.values(DB.draws).filter(d=>!d.finished&&d.endsAt>now).map(d=>`• #${d.id}: ${d.prize} | ${d.participants.length} уч. | ~${Math.ceil((d.endsAt-now)/60000)} мин`).join('\n');
  ctx.reply(list ? `🎁 Розыгрыши:\n\n${list}` : 'Нет активных розыгрышей');
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
app.get('*', (req, res) => res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server on port ${PORT}`);
  if (APP_URL) {
    try { await bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`); console.log('Webhook set'); }
    catch (e) { console.log('Webhook error:', e.message); bot.launch(); }
  } else { bot.launch(); console.log('Bot polling'); }
});

app.post(`/bot${BOT_TOKEN}`, (req, res) => { bot.handleUpdate(req.body, res); });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));