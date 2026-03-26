const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_PERSONAL_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const ADMIN_TOKEN = process.env.GITHUB_ADMIN_TOKEN;
const REPO = 'thxxxf51-hue/giftbot-miniapp';
const ADMIN_REPO_URL = process.env.ADMIN_GITHUB_REPO || '';
const MSG = process.argv[2] || 'Auto-deploy: update from Replit';

if (!TOKEN) { console.error('GITHUB_PERSONAL_TOKEN not set'); process.exit(1); }

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

function runSafe(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    if (out.trim()) console.log(out.trim());
  } catch(e) {}
}

run('git config user.email "bot@giftbot.app"');
run('git config user.name "GiftBot Deploy"');
run(`git remote set-url origin https://${TOKEN}@github.com/${REPO}.git`);

runSafe('git rm --cached -r attached_assets/ --ignore-unmatch 2>/dev/null');

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
} catch(e) {}

run('git push origin main --force');
console.log('✅ Pushed to main repo (giftbot-miniapp) successfully!');

if (ADMIN_TOKEN && ADMIN_REPO_URL) {
  try {
    const adminRepoPath = ADMIN_REPO_URL.replace('https://github.com/', '');
    console.log(`\nPushing to admin repo: ${adminRepoPath}...`);

    runSafe(`git remote remove admin-origin`);
    run(`git remote add admin-origin https://${ADMIN_TOKEN}@github.com/${adminRepoPath}.git`);

    try {
      execSync('git pull --rebase admin-origin main', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    } catch(e) {}

    run('git push admin-origin main --force');
    console.log('✅ Pushed to admin repo successfully!');
    runSafe('git remote remove admin-origin');
  } catch(e) {
    console.error('Admin repo push error:', e.message);
  }
} else {
  console.log('ℹ️ ADMIN_GITHUB_REPO or GITHUB_ADMIN_TOKEN not set — skipping admin repo push');
}
