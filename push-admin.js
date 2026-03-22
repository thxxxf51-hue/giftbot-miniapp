const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_ADMIN_TOKEN;
const OWNER = 'thxxxf51-hue';
const REPO  = 'admin';
const BRANCH = 'main';
const MSG   = process.argv[2] || 'Auto-update from Replit';
const FILES = process.argv.slice(3);

if (!TOKEN) { console.error('GITHUB_ADMIN_TOKEN not set'); process.exit(1); }

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${endpoint}`,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'AdminPanel-Push',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFileSHA(filePath) {
  try {
    const res = await apiRequest('GET', `/contents/${filePath}?ref=${BRANCH}`);
    return res.sha || null;
  } catch { return null; }
}

async function pushFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) { console.error(`⚠️  File not found: ${filePath}`); return; }
  const content = fs.readFileSync(fullPath);
  const encoded = content.toString('base64');
  const sha = await getFileSHA(filePath);
  const body = { message: MSG, content: encoded, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await apiRequest('PUT', `/contents/${filePath}`, body);
  if (res.content) {
    console.log(`✅ Pushed: ${filePath}`);
  } else {
    console.error(`❌ Error pushing ${filePath}:`, res.message || JSON.stringify(res));
  }
}

async function main() {
  if (FILES.length === 0) {
    console.log('Usage: node push-admin.js "commit message" file1 file2 ...');
    console.log('Example: node push-admin.js "update panel" admin/index.html');
    return;
  }
  console.log(`Pushing ${FILES.length} file(s) to admin repo: "${MSG}"`);
  for (const f of FILES) await pushFile(f);
  console.log('✅ All done!');
}

main().catch(console.error);
