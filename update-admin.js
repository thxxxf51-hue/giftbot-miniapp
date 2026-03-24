'use strict';
const https = require('https');

const ADMIN_TOKEN = process.env.GITHUB_ADMIN_TOKEN;
const REPO = process.env.ADMIN_GITHUB_REPO || 'thxxxf51-hue/admin';

function ghGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `token ${ADMIN_TOKEN}`,
        'User-Agent': 'node',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

function ghPut(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'api.github.com',
      path,
      method: 'PUT',
      headers: {
        'Authorization': `token ${ADMIN_TOKEN}`,
        'User-Agent': 'node',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('Fetching admin panel index.html...');
  const file = await ghGet(`/repos/${REPO}/contents/public/index.html`);
  const sha = file.sha;
  let content = Buffer.from(file.content, 'base64').toString('utf8');
  console.log('File length:', content.length, 'SHA:', sha);

  // Replace previewShopImg with canvas-resizing version
  const OLD_FN = `function previewShopImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    shopImgBase64 = e.target.result.split(',')[1];
    document.getElementById('shopImgPreview').innerHTML = \`<img src="\${e.target.result}" style="width:100%;height:100%;object-fit:cover"/>\`;
  };
  reader.readAsDataURL(file);
}`;

  const NEW_FN = `function previewShopImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const TW = 400, TH = 280;
      const canvas = document.createElement('canvas');
      canvas.width = TW; canvas.height = TH;
      const ctx = canvas.getContext('2d');
      const ratio = Math.max(TW / img.width, TH / img.height);
      const sw = TW / ratio, sh = TH / ratio;
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
      const resized = canvas.toDataURL('image/jpeg', 0.88);
      shopImgBase64 = resized.split(',')[1];
      document.getElementById('shopImgPreview').innerHTML = \`<img src="\${resized}" style="width:100%;height:100%;object-fit:cover"/>\`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}`;

  if (!content.includes('function previewShopImg')) {
    console.error('ERROR: previewShopImg not found in file!');
    process.exit(1);
  }

  const updated = content.replace(OLD_FN, NEW_FN);
  if (updated === content) {
    console.log('WARNING: No change made (old string not found exactly). Searching...');
    const idx = content.indexOf('function previewShopImg');
    console.log('Found at index:', idx);
    console.log('Snippet:', content.slice(idx, idx + 300));
    process.exit(1);
  }

  console.log('Content updated. Pushing to GitHub...');
  const result = await ghPut(`/repos/${REPO}/contents/public/index.html`, {
    message: 'admin: canvas-based image resize in previewShopImg',
    content: Buffer.from(updated).toString('base64'),
    sha
  });

  if (result.content) {
    console.log('✅ Admin panel updated! New SHA:', result.content.sha);
  } else {
    console.error('ERROR:', JSON.stringify(result).slice(0, 500));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
