/* ══ SUPPORT CHAT ══ */

let supportHistory = [];
let supportBusy = false;
let supportOpened = false;
let supportMode = 'ai'; // 'ai' | 'waiting' | 'specialist'
let supportPollTimer = null;

function openSupport() {
  const overlay = document.getElementById('support-overlay');
  overlay.style.transform = 'translateY(0)';
  if (!supportOpened) {
    supportOpened = true;
    setTimeout(() => {
      _supportTyping(true);
      setTimeout(() => {
        _supportTyping(false);
        _supportAddMsg('bot', 'Привет! 👋 Я ИИ-помощник SatApp Gifts.\nЗадай любой вопрос — расскажу про игры, баланс, рефералы и всё остальное.');
      }, 900);
    }, 300);
    supportStartPoll();
  }
  setTimeout(() => document.getElementById('support-inp')?.focus(), 400);
}

function closeSupport() {
  document.getElementById('support-overlay').style.transform = 'translateY(100%)';
}

function endSupportChat() {
  if (!confirm('Завершить диалог с поддержкой?')) return;
  // Уведомить специалиста если он был подключён
  if (supportMode === 'specialist' || supportMode === 'waiting') {
    const uid = typeof UID !== 'undefined' ? UID : '';
    fetch('/api/support/user-end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid })
    }).catch(() => {});
  }
  closeSupport();
  setTimeout(() => {
    document.getElementById('support-msgs').innerHTML = '';
    document.getElementById('support-qr').style.display = 'flex';
    supportHistory = [];
    supportBusy = false;
    supportOpened = false;
    supportMode = 'ai';
    _supportSetStatus('ai');
    clearInterval(supportPollTimer);
    supportPollTimer = null;
  }, 350);
}

async function supportSend() {
  const inp = document.getElementById('support-inp');
  const text = inp.value.trim();
  if (!text || supportBusy) return;
  inp.value = ''; inp.style.height = '42px';
  document.getElementById('support-qr').style.display = 'none';

  _supportAddMsg('user', text);

  // Если специалист подключён — пересылаем ему
  if (supportMode === 'specialist') {
    const uid = typeof UID !== 'undefined' ? UID : '';
    const fn = typeof TGU !== 'undefined' ? (TGU?.first_name || 'Пользователь') : 'Пользователь';
    fetch('/api/support/user-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, firstName: fn, text })
    }).catch(() => {});
    return;
  }

  // Ожидание специалиста — не отвечаем
  if (supportMode === 'waiting') return;

  // Вызов специалиста
  if (/специалист/i.test(text)) {
    _supportTyping(true);
    await _delay(700);
    _supportTyping(false);
    _supportAddMsg('bot', 'Отправляю уведомление специалисту 🔔\nОжидайте — обычно отвечают в течение 1–5 минут.');
    _supportSetStatus('waiting');
    supportMode = 'waiting';
    const uid = typeof UID !== 'undefined' ? UID : '';
    const fn = typeof TGU !== 'undefined' ? (TGU?.first_name || 'Пользователь') : 'Пользователь';
    fetch('/api/support/specialist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, firstName: fn })
    }).catch(() => {});
    return;
  }

  // ИИ ответ
  supportBusy = true;
  document.getElementById('support-sbtn').disabled = true;
  supportHistory.push({ role: 'user', content: text });
  _supportTyping(true);

  try {
    const r = await fetch('/api/support/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: supportHistory, userId: typeof UID !== 'undefined' ? UID : '' })
    });
    const data = await r.json();
    if (!data.ok || !data.text) throw new Error(data.debug || 'no reply');
    supportHistory.push({ role: 'assistant', content: data.text });
    _supportTyping(false);
    _supportAddMsg('bot', data.text);
  } catch (e) {
    console.error('Support AI error:', e);
    _supportTyping(false);
    _supportAddMsg('bot', 'Не удалось получить ответ. Попробуйте ещё раз или напишите «вызвать специалиста».');
  }

  supportBusy = false;
  document.getElementById('support-sbtn').disabled = false;
}

function supportSendQuick(text) {
  document.getElementById('support-inp').value = text;
  supportSend();
}

// ── Polling ──────────────────────────────────────────────────
function supportStartPoll() {
  if (supportPollTimer) return;
  supportPollTimer = setInterval(async () => {
    if (!supportOpened) return;
    const uid = typeof UID !== 'undefined' ? UID : '';
    if (!uid) return;
    try {
      const r = await fetch(`/api/support/poll?userId=${uid}`);
      const data = await r.json();
      if (!data.ok) return;

      if (data.messages && data.messages.length > 0) {
        if (supportMode !== 'specialist') {
          supportMode = 'specialist';
          _supportSetStatus('specialist');
          _supportAddMsg('system', '✓ Специалист подключился к чату');
        }
        data.messages.forEach(m => _supportAddMsg('specialist', m.text));
      }

      if (data.status === 'active' && supportMode === 'waiting') {
        supportMode = 'specialist';
        _supportSetStatus('specialist');
        _supportAddMsg('system', '✓ Специалист подключился к чату');
      }
      if (data.status === 'closed' && supportMode === 'specialist') {
        supportMode = 'ai';
        _supportSetStatus('ai');
        _supportAddMsg('system', 'Специалист завершил чат. Если остались вопросы — я здесь 👋');
      }
    } catch {}
  }, 3000);
}

// ── Helpers ──────────────────────────────────────────────────
function _supportAvatarHtml(who) {
  if (who === 'bot') {
    return `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1a1a2e,#2a2a4a);border:1.5px solid rgba(122,164,244,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="8" width="14" height="10" rx="3" fill="#7aa4f4" opacity=".9"/>
        <rect x="9" y="3" width="6" height="5" rx="2" fill="#7aa4f4" opacity=".7"/>
        <rect x="11" y="6" width="2" height="2" rx="1" fill="#1a1a2e"/>
        <circle cx="9" cy="13" r="1.5" fill="#1a1a2e"/>
        <circle cx="15" cy="13" r="1.5" fill="#1a1a2e"/>
        <rect x="9" y="15.5" width="6" height="1.2" rx=".6" fill="#1a1a2e" opacity=".6"/>
        <rect x="2" y="11" width="3" height="1.5" rx=".75" fill="#7aa4f4" opacity=".5"/>
        <rect x="19" y="11" width="3" height="1.5" rx=".75" fill="#7aa4f4" opacity=".5"/>
      </svg>
    </div>`;
  }
  if (who === 'specialist') {
    return `<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;border:1.5px solid rgba(122,164,244,.4);flex-shrink:0;margin-top:2px">
      <img src="/img/specialist.jpg" style="width:100%;height:100%;object-fit:cover">
    </div>`;
  }
  return '';
}

function _supportAddMsg(who, text) {
  const msgs = document.getElementById('support-msgs');
  const isUser = who === 'user';
  const isSystem = who === 'system';
  const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    const d = document.createElement('div');
    d.style.cssText = 'align-self:center;background:rgba(46,204,113,.08);border:1px solid rgba(46,204,113,.18);border-radius:12px;padding:6px 12px;font-size:12px;color:rgba(255,255,255,.5);text-align:center';
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return;
  }

  const formatted = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/«выз[а-яёa-z]* специалиста[»"']?/gi, '«<b style="color:rgba(46,204,113,.9)">вызвать специалиста</b>»')
    .replace(/напишите «вызвать специалиста»/gi, 'напишите <b style="color:rgba(46,204,113,.9)">«вызвать специалиста»</b>');

  const avatarHtml = !isUser ? _supportAvatarHtml(who) : '';
  const senderLabel = who === 'specialist' ? 'Специалист' : who === 'bot' ? 'ИИ-помощник' : '';

  const d = document.createElement('div');
  d.style.cssText = `display:flex;flex-direction:row;align-items:flex-start;gap:8px;max-width:88%;align-self:${isUser ? 'flex-end' : 'flex-start'}`;
  if (isUser) {
    d.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-end">
        <div style="padding:11px 14px;border-radius:18px 18px 5px 18px;font-size:14px;line-height:1.5;word-break:break-word;white-space:pre-wrap;background:#2ecc71">${formatted}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:3px;padding:0 4px;text-align:right">${time}</div>
      </div>
    `;
  } else {
    d.innerHTML = `
      ${avatarHtml}
      <div style="display:flex;flex-direction:column;align-items:flex-start;max-width:calc(100% - 42px)">
        ${senderLabel ? `<div style="font-size:11px;color:rgba(255,255,255,.35);margin-bottom:3px;padding:0 4px">${senderLabel}</div>` : ''}
        <div style="padding:11px 14px;border-radius:18px 18px 18px 5px;font-size:14px;line-height:1.5;word-break:break-word;white-space:pre-wrap;background:#1c1c23;border:1px solid rgba(255,255,255,.06)">${formatted}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:3px;padding:0 4px;text-align:left">${time}</div>
      </div>
    `;
  }
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function _supportTyping(show) {
  document.getElementById('support-typing')?.remove();
  if (!show) return;
  const msgs = document.getElementById('support-msgs');
  const t = document.createElement('div');
  t.id = 'support-typing';
  t.style.cssText = 'display:flex;flex-direction:row;align-items:flex-start;gap:8px;align-self:flex-start';
  t.innerHTML = `
    ${_supportAvatarHtml('bot')}
    <div style="background:#1c1c23;border-radius:18px 18px 18px 5px;padding:12px 16px;display:flex;gap:5px;align-items:center;border:1px solid rgba(255,255,255,.06)">
      <span class="std"></span><span class="std" style="animation-delay:.2s"></span><span class="std" style="animation-delay:.4s"></span>
    </div>
  `;
  msgs.appendChild(t);
  msgs.scrollTop = msgs.scrollHeight;
}

function _supportSetStatus(mode) {
  const dot = document.getElementById('support-status-dot');
  const txt = document.getElementById('support-status-text');
  if (!dot || !txt) return;
  if (mode === 'ai') {
    dot.style.background = '#2ecc71'; txt.style.color = '#2ecc71'; txt.textContent = 'ИИ-помощник онлайн';
  } else if (mode === 'waiting') {
    dot.style.background = '#f4c430'; txt.style.color = '#f4c430'; txt.textContent = 'Ожидаем специалиста...';
  } else if (mode === 'specialist') {
    dot.style.background = '#7aa4f4'; txt.style.color = '#7aa4f4'; txt.textContent = 'Специалист в чате';
  }
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const _sStyle = document.createElement('style');
_sStyle.textContent = `
.std{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.35);display:inline-block;animation:stdB 1.2s infinite}
@keyframes stdB{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
`;
document.head.appendChild(_sStyle);
