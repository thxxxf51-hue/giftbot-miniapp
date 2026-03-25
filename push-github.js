const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const REPO  = 'thxxxf51-hue/giftbot-miniapp';
const MSG   = process.argv[2] || 'Auto-deploy: update from Replit';

if (!TOKEN) { console.error('GITHUB_ACCESS_TOKEN not set'); process.exit(1); }

// Удаляем lock-файлы если есть
['config.lock','index.lock','HEAD.lock'].forEach(f=>{
  const p=path.join(__dirname,'.git',f);
  try{if(fs.existsSync(p)){fs.unlinkSync(p);console.log('Removed lock:',f);}}catch{}
});

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    if (out.trim()) console.log(out.trim());
  } catch(e) {
    const msg = (e.stderr || e.stdout || e.message || '').trim();
    console.error('Error:', msg);
    process.exit(1);
  }
}

run('git config user.email "bot@giftbot.app"');
run('git config user.name "GiftBot Deploy"');
run(`git remote set-url origin https://${TOKEN}@github.com/${REPO}.git`);

// Убираем attached_assets из трекинга если ещё отслеживается
try { execSync('git rm --cached -r attached_assets/ --ignore-unmatch 2>/dev/null', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); } catch{}

try {
  const diff = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (!diff) {
    console.log('Nothing to commit, checking if push is needed...');
  } else {
    run('git add -A');
    run(`git commit -m "${MSG.replace(/"/g, "'")}"`);
  }
} catch(e) {}

try {
  execSync('git pull --rebase origin main', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
} catch(e) {
  // Если pull не получился — всё равно пробуем force push
}
run('git push origin main --force');
console.log('✅ Pushed to GitHub successfully!');
