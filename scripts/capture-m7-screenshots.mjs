import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs/screenshots/m7');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const pages = [
  { name: 'property-intelligence', url: 'http://localhost:3000/intelligence/11111111-1111-1111-1111-111111111111' },
];

const widths = [1440, 1024, 768, 375];

console.log('Capturing responsive screenshots for Milestone M7 using headless Chrome...');

for (const page of pages) {
  for (const width of widths) {
    const filename = `${page.name}-${width}px.png`;
    const outputPath = path.join(outDir, filename);
    const height = width === 375 ? 1200 : width === 768 ? 1400 : 1200;

    const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=${width},${height} --screenshot="${outputPath}" "${page.url}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      console.log(`✓ Captured ${filename} (${width}x${height})`);
    } catch (err) {
      console.error(`✗ Failed to capture ${filename}:`, err.message);
    }
  }
}

console.log('Done capturing M7 screenshots.');

