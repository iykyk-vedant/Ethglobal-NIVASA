import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs/screenshots/m14');
const brainDir = 'C:\\Users\\Vedant\\.gemini\\antigravity\\brain\\afc2e2ba-e540-42e8-a11b-9b2955924a6e\\screenshots\\m14';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

const pages = [
  { name: 'admin-ops', url: 'http://localhost:3000/admin/ops' },
  { name: 'admin-audit', url: 'http://localhost:3000/admin/audit' },
  { name: 'admin-demo', url: 'http://localhost:3000/admin/demo' },
  { name: 'admin-offerings', url: 'http://localhost:3000/admin/offerings' },
];

const widths = [1440, 1024, 768, 375];

console.log('Capturing responsive screenshots for Milestone M14 using headless Chrome...');

for (const page of pages) {
  for (const width of widths) {
    const filename = `${page.name}-${width}px.png`;
    const outputPath = path.join(outDir, filename);
    const brainPath = path.join(brainDir, filename);
    const windowSize = `${width},1050`;

    console.log(`Capturing ${filename} at ${windowSize}...`);
    try {
      execSync(
        `"${chromePath}" --headless --disable-gpu --window-size=${windowSize} --hide-scrollbars --screenshot="${outputPath}" "${page.url}"`,
        { stdio: 'inherit', timeout: 35000 }
      );

      // Copy to artifact directory
      fs.copyFileSync(outputPath, brainPath);
      console.log(`Saved ${filename} to docs and artifact directory.`);
    } catch (err) {
      console.error(`Failed to capture ${filename}:`, err.message);
    }
  }
}

console.log('All Milestone M14 responsive screenshots captured successfully.');
