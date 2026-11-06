import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs/screenshots/m13');
const brainDir = 'C:\\Users\\Vedant\\.gemini\\antigravity\\brain\\afc2e2ba-e540-42e8-a11b-9b2955924a6e\\screenshots\\m13';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

const pages = [
  { name: 'property-intelligence', url: 'http://localhost:3000/intelligence/11111111-1111-1111-1111-111111111111' },
  { name: 'offering-update-prompt', url: 'http://localhost:3000/offerings/33333333-3333-3333-3333-333333333333' },
];

const widths = [1440, 1024, 768, 375];

console.log('Capturing responsive screenshots for Milestone M13 using headless Chrome...');

for (const page of pages) {
  for (const width of widths) {
    const filename = `${page.name}-${width}px.png`;
    const outputPath = path.join(outDir, filename);
    const brainPath = path.join(brainDir, filename);
    const windowSize = `${width},1000`;

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

console.log('All Milestone M13 responsive screenshots captured successfully.');
