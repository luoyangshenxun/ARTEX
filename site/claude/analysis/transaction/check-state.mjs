import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node check-state.mjs FILE');
const text = fs.readFileSync(file, 'utf8');
const match = text.match(/^status:\s*(.+)$/m);
console.log(`status=${match?.[1] ?? 'missing'}`);
