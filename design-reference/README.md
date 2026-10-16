# design-reference

Everything here was generated directly from the approved design files, rendered with the design's own runtime and the real fonts (Geist, Geist Mono, Instrument Serif) at 1× pixel density. Nothing needs to be added by hand.

- `source/` — the approved design's own code (read DESIGN_SPEC.md §0 for how to read it). Do not edit these files.
- `motion/` — the hero + prompt motion: `hero-motion.ts` (use as-is), `TIMELINE.md` (millisecond table), `hero-motion.check.js` (tests that prove it matches the design).

## Screenshots

| File | Screen | Moment |
|---|---|---|
| `hero-night-start.png`, `hero-day-start.png` | Chosen desktop hero + section 02 (1440 × 1840) | 0.4s into the loop — line 1 running |
| `hero-night-prompt-done.png`, `hero-day-prompt-done.png` | same | 17.0s — hero finished, the prompt has typed example 1 and the test run is on box 5 |
| `hero-phone-night-start.png`, `hero-phone-day-start.png` | Chosen phone version (390 × 1970) | 0.4s |
| `hero-phone-night-prompt-done.png`, `hero-phone-day-prompt-done.png` | same | 17.0s |
| `home-night.png`, `home-day.png` | Home, full page (1440 wide) | **Ignore the old graph hero at the top** — use these for the manifesto, selected runs, agent section and footer |
| `run-report-night.png`, `run-report-day.png` | Run report, full page (1440 wide) | static |

## Recordings (frame-accurate)

- `hero-loop.mp4` — desktop hero + section 02, 1440 × 1840, 25 fps, 19.3s: one full loop with example 1 ("Reconcile invoices…"), ending just after the restart.
- `hero-phone-loop.mp4` — the same loop on the phone version, 390 × 1970.

These were recorded in slow motion and reassembled at true speed, so **video time = design time**: the frame at 9.46s is exactly the timeline's `step 10` moment, and so on. The packet's position was checked against `PACKET_POINTS` at nine timestamps in both videos (all within 1.5px). Use them to compare motion side by side with your build (DESIGN_SPEC.md §9).
