import fs from 'fs';

// Destructive one-shot script with a hardcoded absolute path. Guard tightly.
if (process.env.SR_ALLOW_DESTRUCTIVE_SCRIPTS !== '1') {
  console.error('[fix-encoding3] Refusing to run. Set SR_ALLOW_DESTRUCTIVE_SCRIPTS=1 to confirm.');
  process.exit(1);
}

const filePath = 'c:/Users/jenna/Desktop/Portfolio projects/SuiteRhythm-next/engine/SuiteRhythm.js';
let buf = fs.readFileSync(filePath);

const fixes = [
  { find: [0xC3,0xA2, 0xE2,0x82,0xAC, 0xE2,0x80,0x9C], char: '\u2013' }, // en dash –
  { find: [0xC3,0xA2, 0xC2,0x9D, 0xC5,0x92], char: '\u274C' },           // cross mark ❌
];

let total = 0;
for (const { find, char } of fixes) {
  const findBuf = Buffer.from(find);
  const replaceBuf = Buffer.from(char, 'utf8');
  let offset = 0;
  const chunks = [];
  let lastEnd = 0;
  let count = 0;
  while (offset <= buf.length - findBuf.length) {
    const idx = buf.indexOf(findBuf, offset);
    if (idx === -1) break;
    chunks.push(buf.slice(lastEnd, idx));
    chunks.push(replaceBuf);
    lastEnd = idx + findBuf.length;
    offset = lastEnd;
    count++;
  }
  if (count > 0) {
    chunks.push(buf.slice(lastEnd));
    buf = Buffer.concat(chunks);
    console.log(`${char}: ${count} replacements`);
    total += count;
  }
}

console.log(`Total: ${total}`);
if (total > 0) {
  fs.writeFileSync(filePath, buf);
  console.log('Saved');
}

// Verify
let remaining = 0;
for (let i = 0; i < buf.length - 1; i++) {
  if (buf[i] === 0xC3 && buf[i+1] === 0xA2) remaining++;
}
console.log(`Remaining C3 A2 sequences: ${remaining}`);
