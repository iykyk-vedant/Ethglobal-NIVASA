import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs/screenshots/m8');
const brainDir = 'C:\\Users\\Vedant\\.gemini\\antigravity\\brain\\afc2e2ba-e540-42e8-a11b-9b2955924a6e\\screenshots\\m8';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

const pages = [
  { name: 'issuer-workspace', url: 'http://localhost:3000/issuer/properties/11111111-1111-1111-1111-111111111111' },
  { name: 'verifier-review', url: 'http://localhost:3000/verifier/properties/11111111-1111-1111-1111-111111111111' },
  { name: 'issuer-portal', url: 'http://localhost:3000/issuer' },
  { name: 'verifier-queue', url: 'http://localhost:3000/verifier' },
];

const widths = [1440, 1024, 768, 375];

console.log('Capturing responsive screenshots for Milestone M8 using headless Chrome...');

for (const page of pages) {
  for (const width of widths) {
    const filename = `${page.name}-${width}px.png`;
    const outputPath = path.join(outDir, filename);
    const brainPath = path.join(brainDir, filename);
    const height = width === 375 ? 1200 : width === 768 ? 1400 : 1200;

    const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=${width},${height} --screenshot="${outputPath}" "${page.url}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      fs.copyFileSync(outputPath, brainPath);
      console.log(`✓ Captured ${filename} (${width}x${height})`);
    } catch (err) {
      console.error(`✗ Failed to capture ${filename}:`, err.message);
    }
  }
}

console.log('Done capturing M8 screenshots.');
