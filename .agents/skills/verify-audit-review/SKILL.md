---
name: verify-audit-review
description: Verify Linux X-Ray Mission 06 when changing proposal order or verdicts, decision retry and reselect, completion credit, or separation of audit from command execution.
---

# Mission 06 audit

From the repository root run `bash formal/check.sh Audit`, then `node --test`. The formal command bootstraps checksum-pinned TLC 1.7.4 and Zulu JRE 21.0.8 on Linux x86_64 (Bash, curl, tar and coreutils; first run needs network). Read every TLA+ result with the pstack `/statechart` skill. Use `formal/Audit/Audit.tla`, `Audit.cfg` and `view.mjs`; compare the overview and close-ups in `charts.md`.

## Code and step boundaries

Sync commit: `f329610ed397e495b31f5849b0ee6da12e3061c7`.

| Model | Implementation |
|---|---|
| Index 0, 1, 2 | Recursive deletion, direct login-node benchmark, scheduler submission in `js/levels/level6.js`. |
| `Approve`, `Reject` | The click handler in `renderAudit` in `js/main.js` calls `Game.decide` in `js/game.js`; verdict, index update and completion are one synchronous action. |
| `ReselectMission06` | `Game.select`: incomplete review restarts at index 0; completed review remains closed. |
| `accepted`, `dispatched` | Model witnesses, not production variables: credit must match the proposal prefix and no decision may reach `Shell.run`. `tests/contracts.test.js` replaces shell dispatch with a failing guard throughout the review. |

Three fixed proposals, two valid choices, at most three accepted decisions. The machine starts unlocked; no arbitrary commands, invalid input calls, rendering, persisted-data tampering, or other missions. Verdicts are pedagogical fixtures, not a proof of safety for real cluster commands. `tests/play.test.js` reaches the audit via actual mission progression, tries wrong and right decisions, and checks that the VFS fixture survives.

## Prove and maintain

`bash formal/check.sh Audit advance` must violate `CorrectDecisionsInOrder`; `bash formal/check.sh Audit execute` must violate `ProposalsNeverDispatched`. Restore with the baseline command. Replay exact choices in `Game.decide`; inspect its index and trap any attempt to call the simulated shell. If observations differ from a shortened trace, inspect the chart's label projection and the verdict table before deciding which layer is wrong. Report real findings without changing the property. Use `/maintain-formal-verification-skill` and advance the sync commit only after confirming the transition table, tests and charts match.
