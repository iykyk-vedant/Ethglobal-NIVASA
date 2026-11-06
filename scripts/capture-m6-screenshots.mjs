import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs/screenshots/m6');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const pages = [
  { name: 'offering-detail', url: 'http://localhost:3000/offerings/33333333-3333-3333-3333-333333333333' },
  { name: 'investor-dashboard', url: 'http://localhost:3000/investor' },
  { name: 'order-timeline', url: 'http://localhost:3000/investor/orders/ab4cd4cc-c596-424c-9bde-2be2a43ba660' },
  { name: 'settlement-receipt', url: 'http://localhost:3000/verify/receipt/52c5b0e21daded8ab0bc02813269d36b' },
];

const widths = [1440, 1024, 768, 375];

console.log('Capturing responsive screenshots using headless Chrome...');

for (const page of pages) {
  for (const width of widths) {
    const filename = `${page.name}-${width}px.png`;
    const outputPath = path.join(outDir, filename);
    const height = width < 768 ? 1200 : 900;

    console.log(`Taking screenshot: ${page.name} @ ${width}px -> ${filename}`);
    const cmd = `"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=${width},${height} --screenshot="${outputPath}" "${page.url}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 20000 });
      console.log(`  ✓ Saved ${filename}`);
    } catch (e) {
      console.error(`  ✗ Failed to capture ${filename}: ${e.message}`);
    }
  }
}

console.log('Screenshots complete!');
