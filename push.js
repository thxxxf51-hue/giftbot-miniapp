#!/usr/bin/env node
// Usage: node push.js "commit message" file1 file2 ...
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = 'thxxxf51-hue';
const REPO = 'giftbot-miniapp';
const BRANCH = 'main';
const MSG = process.argv[2] || 'auto: update';
const FILES = process.argv.slice(3);

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${endpoint}`,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'GiftBot-Push',
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
  if (!TOKEN) { console.error('GITHUB_PERSONAL_ACCESS_TOKEN not set'); process.exit(1); }
  if (FILES.length === 0) { console.log('Usage: node push.js "message" file1 file2 ...'); return; }
  console.log(`Pushing ${FILES.length} file(s) with message: "${MSG}"`);
  for (const f of FILES) await pushFile(f);
  console.log('All done!');
}

main().catch(console.error);
