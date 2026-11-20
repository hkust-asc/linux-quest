---
name: verify-mission-conditions
description: Verify Linux X-Ray mission unlocks and win conditions when changing Game.run, Mission 01 reveal, or Mission 02 diagnostic installation, permissions, invocation, or feedback.
---

# Mission win conditions

From the repository root run `bash formal/check.sh Mission`, then `node --test`. The formal command bootstraps checksum-pinned TLC 1.7.4 and Zulu JRE 21.0.8 on Linux x86_64 (Bash, curl, tar and coreutils; first run needs network). Read every TLA+ result with the pstack `/statechart` skill. In `formal/Mission/`, use `Mission.tla`, `Mission.cfg`, and `view.mjs`; compare the whole-machine overview and close-ups in `charts.md`.

## Code and step boundaries

Sync commit: `f329610ed397e495b31f5849b0ee6da12e3061c7`. The filename, method, and transition map:

| Model | Implementation |
|---|---|
| `RevealWorkspace`, `ReadToken` | `commands.ls`, `commands.cat` in `js/commands.js`; `observe` in `js/levels/level1.js`. `revealed` is a successfully observed workspace reveal, not a partially applied failed `ls`. |
| `SelectMission02` | `Game.select`, `isUnlocked`, `isComplete` in `js/game.js`; `progressStore.complete` in `js/storage.js`; `createVFS` in `js/vfs.js`; `setup` in `js/levels/level2.js`. `tokenRead` denotes Mission 01 credit, not merely seeing bytes. |
| `MoveDownload`, `CopyDownload`, `RemoveDownload`, `SetExecuteBit`, `ChangeDirectory`, `OverwriteWithEcho` | `commands.mv`, `cp`, `rm`, `chmod`, `cd`, `echo`; `VFS.transfer`, `remove`, `openOutput`; `Shell.run` and `executable`. |
| `LaunchRelative`, `LaunchAbsolute`, `SourceDiagnostic` | `Shell.execute`, `runFile`, `commands.source`, `Game.run` and `level2.observe`. `last.awarded` means this submission granted new credit; later commands cannot revoke earned credit. |

One action is one synchronous Game submission with observation, or a mission selection. The finite fixture uses Missions 01–02, two working directories, the vault token, two canonical diagnostic paths, three content/origin classes plus absence, and an owner execute bit. It models valid single-stage representatives and runs that are blocked or sourced; identity is tracked only to reproduce the bug. Failed, help, nested and pipeline submissions, reselect/reset, storage reload, Levels 03–06, other paths, and feedback copy/rendering are not model-checked. `tests/game.test.js`, `tests/play.test.js`, and `tests/contracts.test.js` exercise player-facing feedback, combined flags and real VFS state.

## Prove and maintain

Run `bash formal/check.sh Mission reveal`, then `leftover`, `content`, and `identity` in the same argument position. They must fail respectively on `RevealBeforeRead`, `InstallSoundness` (twice), and `InstallResponsiveness`, not on a tool error. Rerun the fixed command afterwards. For each trace, replay the equivalent commands through `Game.run` and compare the affected state, not just stdout. A mismatch means inspect the projection or an excluded command before declaring a product bug. Report a confirmed counterexample, including its commands and affected guard, rather than weakening the property. Use `/maintain-formal-verification-skill` after intentional changes and advance the sync commit only after the step map, tests, counterexamples and charts match the new revision.
