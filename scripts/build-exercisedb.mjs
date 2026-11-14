// Usage: node scripts/build-exercisedb.mjs <path-to-exercises.json>
// Generates data/exercisedb.js from the MIT ExerciseDB dataset (text only).
import { readFileSync, writeFileSync } from 'node:fs';
import { convertRecord } from './exercisedb-convert.mjs';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/build-exercisedb.mjs <path-to-exercises.json>');
  process.exit(1);
}

const LICENSE = `MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const raw = JSON.parse(readFileSync(src, 'utf8'));
const records = Array.isArray(raw) ? raw : raw.exercises;
const converted = records.map(convertRecord).sort((a, b) => a.id.localeCompare(b.id));
const seenNames = new Set();
const entries = converted.filter((e) => {
  const k = e.name.toLowerCase();
  if (seenNames.has(k)) return false;
  seenNames.add(k);
  return true;
});

const header = `/*
 * GENERATED FILE - DO NOT EDIT. Regenerate with scripts/build-exercisedb.mjs.
 * Source: https://github.com/hasaneyldrm/exercises-dataset
 * Text data only; exercise media (images/videos) is NOT included.
 *
${LICENSE.split('\n').map((l) => (l ? ` * ${l}` : ' *')).join('\n')}
 */
`;

const body = `export const EXERCISEDB_EXERCISES = [\n${entries.map((e) => `  ${JSON.stringify(e)},`).join('\n')}\n];\n`;
writeFileSync(new URL('../data/exercisedb.js', import.meta.url), header + body);
console.log(`Wrote ${entries.length} exercises (dropped ${converted.length - entries.length} duplicate names)`);
