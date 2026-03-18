const { execSync } = require('child_process');

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const REPO  = 'thxxxf51-hue/giftbot-miniapp';
const MSG   = process.argv[2] || 'Auto-deploy: update from Replit';

if (!TOKEN) { console.error('GITHUB_PERSONAL_ACCESS_TOKEN not set'); process.exit(1); }

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

try {
  const diff = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (!diff) {
    console.log('Nothing to commit, checking if push is needed...');
  } else {
    run('git add -A');
    run(`git commit -m "${MSG.replace(/"/g, "'")}"`);
  }
} catch(e) {}

run('git push origin main');
console.log('✅ Pushed to GitHub successfully!');
