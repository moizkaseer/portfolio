# Motion timeline — frame-accurate

Generated from the approved design's own timing code (design-reference/source/HeroCombo.html) and verified by `hero-motion.ts`. Times are milliseconds from the start of each loop. The hero and the prompt are ONE timeline: the four loops below play in order, forever, and pause when both sections are off-screen or the tab is hidden.

Transitions that run when a value changes (from the design): headline fill 0.5s · wires 0.4s (rail 0.5s) · nodes 0.3s · underline 0.6s · › 0.4s · packet moves use cubic-bezier(0.65, 0, 0.35, 1) with the duration shown in brackets · prompt boxes rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) · connectors draw 0.35s same curve.

### Loop with example 1: "Reconcile invoices from Gmail into our accounting tool" — total 18.874s
| t (ms) | event | what changes |
|---:|---|---|
| 0 | step 0 | RESET: all lines hollow, all wires dim; packet jumps to node 1; line 1 "I build" RUNNING (solid), node 1 orange; log row 1; prompt shows the upcoming example as faint ghosts, text empty, underline dim (jump (no transition)) |
| 1400 | step 1 | line 1 DONE (node 1 ink), wire 1→2 lights; packet moves down to the corner (500ms move) |
| 1880 | step 2 | packet arrives at node 2: line 2 "agents" RUNNING (solid), node 2 orange; log row 2 (500ms move) |
| 3280 | step 3 | line 2 DONE, wire 2→3 lights; packet moves down to the corner (500ms move) |
| 3760 | step 4 | packet arrives at node 3: line 3 "that do" RUNNING, node 3 orange; log row 3 (500ms move) |
| 5160 | step 5 | line 3 DONE, wire 3→4 lights; packet moves down to the corner (500ms move) |
| 5640 | step 6 | packet arrives at node 4: line 4 "the work." RUNNING, node 4 orange; log row 4 (500ms move) |
| 7040 | step 7 | line 4 DONE, out-wire lights; packet drops below node 4 (450ms move) |
| 7660 | step 8 | packet travels right to the SHIPPED node, which turns orange; log row 5 "done"; panel label → complete · 8.2s (800ms move) |
| 8560 | step 9 | rail lights; packet travels down the right margin to the prompt (850ms move) |
| 9460 | step 10 | underline + › light up; packet slides left along the underline to the ›; TYPING STARTS NOW (same instant) (1050ms move) |
| 9494 | type 1 | first character appears (then one character every 34–70ms: 34 + (length % 5) × 9) |
| 12250 | typed | last character typed (54 chars) |
| 12670 | build 0 | status → Designing the system · 0 / 5 |
| 12910 | reveal 1 | node 1 appears (0.45s rise / 0.35s line) |
| 13150 | reveal 2 | node 2 appears; connector 1→2 draws (0.45s rise / 0.35s line) |
| 13390 | reveal 3 | node 3 appears; connector 2→3 draws (0.45s rise / 0.35s line) |
| 13630 | reveal 4 | node 4 appears; connector 3→4 draws (0.45s rise / 0.35s line) |
| 13870 | reveal 5 | node 5 appears; connector 4→5 draws (0.45s rise / 0.35s line) |
| 14070 | run 1 | test run: node 1 active |
| 14590 | run 2 | node 2 active; packet on connector 1→2 |
| 15110 | run 3 | node 3 active; packet on connector 2→3 |
| 15630 | run 4 | node 4 active; packet on connector 3→4 |
| 16150 | run 5 | node 5 active; packet on connector 4→5 |
| 18350 | erase | erasing starts (2 characters every 12ms); status → Next example; boxes fade back to ghosts as the text shrinks |
| 18674 | erased | text empty (27 erase ticks) |
| 18874 | restart | hero resets to step 0 (packet jumps back, all lines hollow) |

### Loop with example 2: "Answer refund emails and escalate the angry ones" — total 18.517s
| t (ms) | event | what changes |
|---:|---|---|
| 0 | step 0 | RESET: all lines hollow, all wires dim; packet jumps to node 1; line 1 "I build" RUNNING (solid), node 1 orange; log row 1; prompt shows the upcoming example as faint ghosts, text empty, underline dim (jump (no transition)) |
| 1400 | step 1 | line 1 DONE (node 1 ink), wire 1→2 lights; packet moves down to the corner (500ms move) |
| 1880 | step 2 | packet arrives at node 2: line 2 "agents" RUNNING (solid), node 2 orange; log row 2 (500ms move) |
| 3280 | step 3 | line 2 DONE, wire 2→3 lights; packet moves down to the corner (500ms move) |
| 3760 | step 4 | packet arrives at node 3: line 3 "that do" RUNNING, node 3 orange; log row 3 (500ms move) |
| 5160 | step 5 | line 3 DONE, wire 3→4 lights; packet moves down to the corner (500ms move) |
| 5640 | step 6 | packet arrives at node 4: line 4 "the work." RUNNING, node 4 orange; log row 4 (500ms move) |
| 7040 | step 7 | line 4 DONE, out-wire lights; packet drops below node 4 (450ms move) |
| 7660 | step 8 | packet travels right to the SHIPPED node, which turns orange; log row 5 "done"; panel label → complete · 8.2s (800ms move) |
| 8560 | step 9 | rail lights; packet travels down the right margin to the prompt (850ms move) |
| 9460 | step 10 | underline + › light up; packet slides left along the underline to the ›; TYPING STARTS NOW (same instant) (1050ms move) |
| 9494 | type 1 | first character appears (then one character every 34–70ms: 34 + (length % 5) × 9) |
| 11929 | typed | last character typed (48 chars) |
| 12349 | build 0 | status → Designing the system · 0 / 5 |
| 12589 | reveal 1 | node 1 appears (0.45s rise / 0.35s line) |
| 12829 | reveal 2 | node 2 appears; connector 1→2 draws (0.45s rise / 0.35s line) |
| 13069 | reveal 3 | node 3 appears; connector 2→3 draws (0.45s rise / 0.35s line) |
| 13309 | reveal 4 | node 4 appears; connector 3→4 draws (0.45s rise / 0.35s line) |
| 13549 | reveal 5 | node 5 appears; connector 4→5 draws (0.45s rise / 0.35s line) |
| 13749 | run 1 | test run: node 1 active |
| 14269 | run 2 | node 2 active; packet on connector 1→2 |
| 14789 | run 3 | node 3 active; packet on connector 2→3 |
| 15309 | run 4 | node 4 active; packet on connector 3→4 |
| 15829 | run 5 | node 5 active; packet on connector 4→5 |
| 18029 | erase | erasing starts (2 characters every 12ms); status → Next example; boxes fade back to ghosts as the text shrinks |
| 18317 | erased | text empty (24 erase ticks) |
| 18517 | restart | hero resets to step 0 (packet jumps back, all lines hollow) |

### Loop with example 3: "Every Monday, send a KPI summary to Slack" — total 18.126s
| t (ms) | event | what changes |
|---:|---|---|
| 0 | step 0 | RESET: all lines hollow, all wires dim; packet jumps to node 1; line 1 "I build" RUNNING (solid), node 1 orange; log row 1; prompt shows the upcoming example as faint ghosts, text empty, underline dim (jump (no transition)) |
| 1400 | step 1 | line 1 DONE (node 1 ink), wire 1→2 lights; packet moves down to the corner (500ms move) |
| 1880 | step 2 | packet arrives at node 2: line 2 "agents" RUNNING (solid), node 2 orange; log row 2 (500ms move) |
| 3280 | step 3 | line 2 DONE, wire 2→3 lights; packet moves down to the corner (500ms move) |
| 3760 | step 4 | packet arrives at node 3: line 3 "that do" RUNNING, node 3 orange; log row 3 (500ms move) |
| 5160 | step 5 | line 3 DONE, wire 3→4 lights; packet moves down to the corner (500ms move) |
| 5640 | step 6 | packet arrives at node 4: line 4 "the work." RUNNING, node 4 orange; log row 4 (500ms move) |
| 7040 | step 7 | line 4 DONE, out-wire lights; packet drops below node 4 (450ms move) |
| 7660 | step 8 | packet travels right to the SHIPPED node, which turns orange; log row 5 "done"; panel label → complete · 8.2s (800ms move) |
| 8560 | step 9 | rail lights; packet travels down the right margin to the prompt (850ms move) |
| 9460 | step 10 | underline + › light up; packet slides left along the underline to the ›; TYPING STARTS NOW (same instant) (1050ms move) |
| 9494 | type 1 | first character appears (then one character every 34–70ms: 34 + (length % 5) × 9) |
| 11574 | typed | last character typed (41 chars) |
| 11994 | build 0 | status → Designing the system · 0 / 5 |
| 12234 | reveal 1 | node 1 appears (0.45s rise / 0.35s line) |
| 12474 | reveal 2 | node 2 appears; connector 1→2 draws (0.45s rise / 0.35s line) |
| 12714 | reveal 3 | node 3 appears; connector 2→3 draws (0.45s rise / 0.35s line) |
| 12954 | reveal 4 | node 4 appears; connector 3→4 draws (0.45s rise / 0.35s line) |
| 13194 | reveal 5 | node 5 appears; connector 4→5 draws (0.45s rise / 0.35s line) |
| 13394 | run 1 | test run: node 1 active |
| 13914 | run 2 | node 2 active; packet on connector 1→2 |
| 14434 | run 3 | node 3 active; packet on connector 2→3 |
| 14954 | run 4 | node 4 active; packet on connector 3→4 |
| 15474 | run 5 | node 5 active; packet on connector 4→5 |
| 17674 | erase | erasing starts (2 characters every 12ms); status → Next example; boxes fade back to ghosts as the text shrinks |
| 17926 | erased | text empty (21 erase ticks) |
| 18126 | restart | hero resets to step 0 (packet jumps back, all lines hollow) |

### Loop with example 4: "Research new leads and add them to the CRM" — total 18.169s
| t (ms) | event | what changes |
|---:|---|---|
| 0 | step 0 | RESET: all lines hollow, all wires dim; packet jumps to node 1; line 1 "I build" RUNNING (solid), node 1 orange; log row 1; prompt shows the upcoming example as faint ghosts, text empty, underline dim (jump (no transition)) |
| 1400 | step 1 | line 1 DONE (node 1 ink), wire 1→2 lights; packet moves down to the corner (500ms move) |
| 1880 | step 2 | packet arrives at node 2: line 2 "agents" RUNNING (solid), node 2 orange; log row 2 (500ms move) |
| 3280 | step 3 | line 2 DONE, wire 2→3 lights; packet moves down to the corner (500ms move) |
| 3760 | step 4 | packet arrives at node 3: line 3 "that do" RUNNING, node 3 orange; log row 3 (500ms move) |
| 5160 | step 5 | line 3 DONE, wire 3→4 lights; packet moves down to the corner (500ms move) |
| 5640 | step 6 | packet arrives at node 4: line 4 "the work." RUNNING, node 4 orange; log row 4 (500ms move) |
| 7040 | step 7 | line 4 DONE, out-wire lights; packet drops below node 4 (450ms move) |
| 7660 | step 8 | packet travels right to the SHIPPED node, which turns orange; log row 5 "done"; panel label → complete · 8.2s (800ms move) |
| 8560 | step 9 | rail lights; packet travels down the right margin to the prompt (850ms move) |
| 9460 | step 10 | underline + › light up; packet slides left along the underline to the ›; TYPING STARTS NOW (same instant) (1050ms move) |
| 9494 | type 1 | first character appears (then one character every 34–70ms: 34 + (length % 5) × 9) |
| 11617 | typed | last character typed (42 chars) |
| 12037 | build 0 | status → Designing the system · 0 / 5 |
| 12277 | reveal 1 | node 1 appears (0.45s rise / 0.35s line) |
| 12517 | reveal 2 | node 2 appears; connector 1→2 draws (0.45s rise / 0.35s line) |
| 12757 | reveal 3 | node 3 appears; connector 2→3 draws (0.45s rise / 0.35s line) |
| 12997 | reveal 4 | node 4 appears; connector 3→4 draws (0.45s rise / 0.35s line) |
| 13237 | reveal 5 | node 5 appears; connector 4→5 draws (0.45s rise / 0.35s line) |
| 13437 | run 1 | test run: node 1 active |
| 13957 | run 2 | node 2 active; packet on connector 1→2 |
| 14477 | run 3 | node 3 active; packet on connector 2→3 |
| 14997 | run 4 | node 4 active; packet on connector 3→4 |
| 15517 | run 5 | node 5 active; packet on connector 4→5 |
| 17717 | erase | erasing starts (2 characters every 12ms); status → Next example; boxes fade back to ghosts as the text shrinks |
| 17969 | erased | text empty (21 erase ticks) |
| 18169 | restart | hero resets to step 0 (packet jumps back, all lines hollow) |

**Full cycle of all four examples: 73686 ms**, then it repeats from example 1.
