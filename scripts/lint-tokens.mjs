import fs from 'fs';
import path from 'path';

const dirsToScan = ['app', 'components'];
const allowedFiles = ['app/globals.css', 'tailwind.config.ts'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

let violations = 0;
const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

for (const dir of dirsToScan) {
  if (!fs.existsSync(dir)) continue;
  const files = walk(dir);
  for (const file of files) {
    const norm = file.replace(/\\/g, '/');
    if (allowedFiles.includes(norm) || norm.endsWith('.d.ts')) continue;
    if (norm.endsWith('.tsx') || norm.endsWith('.ts')) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, lineNo) => {
        // Ignore comments
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        const matches = line.match(hexRegex);
        if (matches) {
          // If in className or style
          matches.forEach((hex) => {
            console.error(`[TOKEN_VIOLATION] Hardcoded hex color ${hex} found in ${norm}:${lineNo + 1}`);
            console.error(`  Line: ${line.trim()}`);
            violations++;
          });
        }
      });
    }
  }
}

if (violations > 0) {
  console.error(`FAILED: Found ${violations} hardcoded hex color(s). Components must use semantic tokens.`);
  process.exit(1);
} else {
  console.log('SUCCESS: All components consume semantic design tokens exclusively.');
  process.exit(0);
}
