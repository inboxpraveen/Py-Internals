#!/usr/bin/env node
/*
 * Sanity checks for every session's demo data. Needs node and nothing else.
 *
 *   node tools/check_sessions.js              all sessions
 *   node tools/check_sessions.js 09-modules   just one
 *
 * Exits 1 if anything is wrong. Warnings do not fail the run.
 *
 * What it checks, per demo:
 *   - session.js parses and defines DEMOS
 *   - every `lines:` number is a real line of that demo's own `code`
 *   - the first step has no lines (empty state)
 *   - every `ref` on a variable names an object that is on the heap in that step
 *     (warning only: Session 07 leaves some off on purpose to save space)
 *   - small ints (-5 to 256) are drawn with refcount "∞" and never as gc
 *   - a pointer label is not typed as a str, which would draw it in quotes
 *   - the step count is between 5 and 10 (warning only)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', 'sessions');
const only = process.argv[2];
const folders = fs.readdirSync(root)
  .filter(d => fs.existsSync(path.join(root, d, 'session.js')))
  .filter(d => !only || d === only)
  .sort();

if (!folders.length) {
  console.error(only ? `No session named ${only}` : 'No sessions found');
  process.exit(1);
}

let bad = 0;
let warned = 0;
const fail = (...a) => { console.log('  BAD ', ...a); bad++; };
const warn = (...a) => { console.log('  WARN', ...a); warned++; };

function loadDemos(file) {
  // Drop the DOMContentLoaded bootstrap, run the rest, read DEMOS back out.
  const src = fs.readFileSync(file, 'utf8').replace(/document\.addEventListener[\s\S]*$/, '');
  const sandbox = { PJ: {}, document: { addEventListener() {} }, window: {}, console };
  return vm.runInNewContext(src + '\n;DEMOS;', sandbox, { filename: file });
}

for (const folder of folders) {
  console.log(folder);
  let demos;
  try {
    demos = loadDemos(path.join(root, folder, 'session.js'));
  } catch (err) {
    fail('session.js does not load:', err.message);
    continue;
  }

  for (const [key, d] of Object.entries(demos)) {
    const total = d.code.split('\n').length;
    const first = d.steps[0];
    if (first && (first.lines || []).length) fail(key, 'step 1 should have lines: []');
    if (d.steps.length < 5 || d.steps.length > 10) warn(key, `has ${d.steps.length} steps`);

    d.steps.forEach((s, i) => {
      const at = `${key} step ${i + 1}`;
      (s.lines || []).forEach(n => {
        if (n < 1 || n > total) fail(at, `line ${n} (code has ${total} lines)`);
      });

      const m = s.memory;
      if (!m) return;
      const heap = m.heap || [];
      const ids = new Set(heap.map(o => o.id));
      (m.frames || (m.frame ? [m.frame] : [])).forEach(f => (f.vars || []).forEach(v => {
        if (v.ref && !ids.has(v.ref)) warn(at, `${v.name} -> ${v.ref} is not on the heap`);
      }));

      heap.forEach(o => {
        const small = o.type === 'int' && typeof o.value === 'number' && o.value >= -5 && o.value <= 256;
        if (small && (o.refcount !== '∞' || o.state === 'gc')) {
          fail(at, `int ${o.value} has refcount ${o.refcount}, state ${o.state}`);
        }
        [...(o.items || []), ...(o.pairs || [])].forEach(cell => {
          if (typeof cell.value === 'string' && /(-> |@ )0x/.test(cell.value) && cell.type !== 'ref') {
            fail(at, `pointer label typed as ${cell.type}: ${cell.value}`);
          }
        });
      });
    });
  }
}

console.log(bad
  ? `\nFAILED: ${bad} problem(s), ${warned} warning(s)`
  : `\nOK: ${folders.length} session(s) clean, ${warned} warning(s)`);
process.exit(bad ? 1 : 0);
