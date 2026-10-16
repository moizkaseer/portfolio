// Expectations that prove hero-motion.ts matches the design to the millisecond.
// Port these into the project test runner (e.g. Vitest) and keep them passing.
// To run as-is: compile hero-motion.ts to hero-motion.js next to this file, then `node hero-motion.check.js`.
const m = require('./hero-motion.js');
const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); if (!ok) process.exitCode = 1; };
// loop durations must equal the timeline computed from the design
expect('loop 1 duration', m.loopDuration(0), 18874);
expect('loop 2 duration', m.loopDuration(1), 18517);
expect('loop 3 duration', m.loopDuration(2), 18126);
expect('loop 4 duration', m.loopDuration(3), 18169);
// hero step timestamps
const stepAt = (t) => m.stateAt(0, t).step;
expect('step at 1399', stepAt(1399), 0);
expect('step at 1400', stepAt(1400), 1);
expect('step at 7660', stepAt(7660), 8);
expect('step at 9460', stepAt(9460), 10);
// typing starts at the same moment as step 10
expect('phase at 9460', m.stateAt(0, 9460).phase, 'typing');
expect('typed at 9459', m.stateAt(0, 9459).typed, '');
expect('first char at 9494', m.stateAt(0, 9494).typed, 'R');
expect('fully typed at 12250', m.stateAt(0, 12250).typed, 'Reconcile invoices from Gmail into our accounting tool');
expect('building at 12670', m.stateAt(0, 12670).phase, 'building');
expect('revealed at 13870', m.stateAt(0, 13870).revealed, 5);
expect('run node 5 at 16150', m.stateAt(0, 16150).active, 4);
expect('erasing at 18350', m.stateAt(0, 18350).phase, 'erasing');
expect('empty at 18674', m.stateAt(0, 18674).typed, '');
// ghosts: during the hero run the prompt shows the upcoming example's titles
const v0 = m.deriveVisuals(m.stateAt(1, 100));
expect('ghost titles are next example', v0.prompt.nodes.map(n => n.title)[0], 'Support inbox');
expect('ghosts hidden', v0.prompt.nodes.every(n => !n.shown), true);
expect('underline unlit at start', v0.prompt.underlineLit, false);
expect('lines at step 0', v0.hero.lines, ['running', 'queued', 'queued', 'queued']);
const v1 = m.deriveVisuals(m.stateAt(0, 1400));
expect('lines at step 1', v1.hero.lines, ['done', 'queued', 'queued', 'queued']);
expect('seg0 lit at step 1', v1.hero.wireLit.seg0, true);
const v10 = m.deriveVisuals(m.stateAt(0, 9460));
expect('underline lit at step 10', v10.prompt.underlineLit, true);
expect('log rows at step 10', v10.hero.logRows.length, 5);
expect('summary text', m.deriveVisuals(m.stateAt(0, 13000)).prompt.summary, '5 steps · 1 model · 1 human check');
expect('match: invoice', m.matchTemplate('please reconcile my invoices'), 0);
expect('match: none', m.matchTemplate('water the plants'), -2);

// ---- Phone: packet points must match design-reference/source/HeroComboMobile.html ----
const fs = require('fs');
const path = require('path');
const phoneSrc = fs.readFileSync(path.join(__dirname, '..', 'source', 'HeroComboMobile.html'), 'utf8');
const phoneP = JSON.parse(phoneSrc.match(/const P = (\[\[.*?\]\]);/)[1]);
expect('phone packet points match the phone design', m.PACKET_POINTS.mobile, phoneP);
const deskSrc = fs.readFileSync(path.join(__dirname, '..', 'source', 'HeroCombo.html'), 'utf8');
const deskP = JSON.parse(deskSrc.match(/const P = (\[\[.*?\]\]);/)[1]);
expect('desktop packet points match the desktop design', m.PACKET_POINTS.desktop, deskP);
const phoneHolds = JSON.parse(phoneSrc.match(/const holds = (\[[^\]]*\])/)[1]);
expect('phone design uses the same step timings', phoneHolds.slice(0, 10), [...m.HOLDS_MS]);
