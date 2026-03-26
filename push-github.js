const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN = process.env.GITHUB_PERSONAL_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const ADMIN_TOKEN = process.env.GITHUB_ADMIN_TOKEN;
const REPO = 'thxxxf51-hue/giftbot-miniapp';
const ADMIN_REPO_URL = process.env.ADMIN_GITHUB_REPO || '';
const MSG = process.argv[2] || 'Auto-deploy: update from Replit';

if (!TOKEN) { console.error('GITHUB_PERSONAL_TOKEN not set'); process.exit(1); }

function exec(cmd, cwd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], cwd: cwd || __dirname });
    if (out && out.trim()) console.log(out.trim());
    return out || '';
  } catch(e) {
    const msg = String(e.stderr || e.stdout || e.message || '').trim();
    console.error('Error:', msg);
    process.exit(1);
  }
}

function execSafe(cmd, cwd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], cwd: cwd || __dirname }) || ''; }
  catch(e) { return ''; }
}

// Remove lock files
['config.lock','index.lock','HEAD.lock','MERGE_HEAD','CHERRY_PICK_HEAD'].forEach(f=>{
  const p=path.join(__dirname,'.git',f);
  try{if(fs.existsSync(p)){fs.unlinkSync(p);console.log('Removed lock:',f);}}catch{}
});

// Abort any in-progress rebase/merge without resetting files
execSafe('git rebase --abort');
execSafe('git merge --abort');

exec('git config user.email "bot@giftbot.app"');
exec('git config user.name "GiftBot Deploy"');
exec(`git remote set-url origin https://${TOKEN}@github.com/${REPO}.git`);
execSafe('git remote remove admin-origin');
execSafe('git rm --cached -r attached_assets/ --ignore-unmatch');

// Add all and commit
exec('git add -A');
const status = execSafe('git status --porcelain').trim();
if (status) {
  exec(`git commit -m "${MSG.replace(/"/g, "'")}"`);
} else {
  console.log('Nothing new to commit.');
}

exec('git push origin main --force');
console.log('Pushed to main repo (giftbot-miniapp) successfully!');

// Admin repo: push using clean temp copy
if (ADMIN_TOKEN && ADMIN_REPO_URL) {
  const adminRepoPath = ADMIN_REPO_URL.replace('https://github.com/', '').replace(/\.git$/, '');
  const tmpDir = path.join(os.tmpdir(), 'giftbot-admin-' + Date.now());
  console.log('Pushing to admin repo: ' + adminRepoPath + '...');
  try {
    execSync('mkdir -p "' + tmpDir + '"', { stdio: 'pipe' });
    execSync(
      'rsync -a --exclude=.git --exclude=node_modules --exclude=attached_assets --exclude=.local "' + __dirname + '/" "' + tmpDir + '/"',
      { stdio: 'pipe' }
    );
    function t(cmd) {
      try {
        const o = execSync(cmd, { cwd: tmpDir, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
        if (o && o.trim()) console.log(o.trim());
      } catch(e) {
        console.log(String(e.stderr || e.stdout || e.message || '').trim());
      }
    }
    t('git init');
    t('git config user.email "bot@giftbot.app"');
    t('git config user.name "GiftBot Deploy"');
    t('git add -A');
    t('git commit -m "' + MSG.replace(/"/g, "'") + '"');
    t('git remote add origin https://' + ADMIN_TOKEN + '@github.com/' + adminRepoPath + '.git');
    t('git push origin main --force');
    console.log('Pushed to admin repo successfully!');
  } catch(err) {
    console.error('Admin repo push error:', String(err.message || err).trim());
  } finally {
    try { execSync('rm -rf "' + tmpDir + '"', { stdio: 'pipe' }); } catch(e) {}
  }
} else {
  console.log('ADMIN_GITHUB_REPO or GITHUB_ADMIN_TOKEN not set — skipping admin repo push');
}
