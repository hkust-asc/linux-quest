---
name: verify-mission-conditions
description: Verify Linux X-Ray mission unlocks and win conditions when changing Game.run, Mission 01 reveal, or Mission 02 diagnostic installation, permissions, invocation, or feedback.
---

# Mission win conditions

From the repository root run `bash formal/check.sh Mission`, then `node --test`. The formal command bootstraps checksum-pinned TLC 1.7.4 and Zulu JRE 21.0.8 on Linux x86_64 (Bash, curl, tar and coreutils; first run needs network). Read every TLA+ result with the pstack `/statechart` skill. In `formal/Mission/`, use `Mission.tla`, `Mission.cfg`, and `view.mjs`; compare the whole-machine overview and close-ups in `charts.md`.

## Code and step boundaries

Sync commit: `09260970102c4e85b71866f5c6df14c8cc380261`. The filename, method, and transition map:

| Model | Implementation |
|---|---|
| `RevealWorkspace`, `ReadToken` | `commands.ls`, `commands.cat` in `js/commands.js`; `observe` in `js/levels/level1.js`. `revealed` is a successfully observed workspace reveal, not a partially applied failed `ls`. |
| `SelectMission02` | `Game.select`, `isUnlocked`, `isComplete` in `js/game.js`; `progressStore.complete` in `js/storage.js`; `createVFS` in `js/vfs.js`; `setup` in `js/levels/level2.js`. `tokenRead` denotes Mission 01 credit, not merely seeing bytes. |
| `MoveDownload`, `CopyDownload`, `RemoveDownload`, `SetExecuteBit`, `ChangeDirectory`, `OverwriteWithEcho` | `commands.mv`, `cp`, `rm`, `chmod`, `cd`, `echo`; `VFS.transfer`, `remove`, `openOutput`; `Shell.run` and `executable`. |
| `LaunchRelative`, `LaunchAbsolute`, `SourceDiagnostic` | `Shell.execute`, `runFile`, `commands.source`, `Game.run` and `level2.observe`. `last.awarded` means this submission granted new credit; later commands cannot revoke earned credit. |
| `LaunchThenRemove`, `RemoveThenLaunch` | `Shell.run` executes stages left-to-right, capturing `VFS.snapshot()` as `event.vfsAtExecution` after redirect setup and before `Shell.execute`. `level2.observe` reads the snapshot, not the live `shell.vfs`. `last.launchDownload` corresponds to presence in the launch snapshot; `download` after the transition is the final VFS value. |

One action is one synchronous Game submission with observation, or a mission selection. The finite fixture uses Missions 01–02, two working directories, the vault token, two canonical diagnostic paths, three content/origin classes plus absence, and an owner execute bit. It models single-stage representatives and both orders of one pipe between `./diag.sh` in `~/bin` and a successful removal of the download. Those stages execute serially, neither uses piped input, and only the download changes between launch and final VFS state; installed content, mode, and cwd are unchanged within these two pipelines. Identity is tracked only to reproduce the old bug.

The model does not check other pipeline compositions, general command failures, help, redirects, nested submissions, reselect/reset, storage reload, Levels 03–06, other paths, or feedback copy/rendering. The result is a check of this finite model under these assumptions, not proof of equivalence to production JavaScript. `tests/game.test.js` plays both pipeline orders and checks feedback and persistent credit; `tests/play.test.js` replays Act 1; `tests/contracts.test.js` checks that the Mission 02 observer can decide without a live shell and that generic stage VFS evidence survives redirect and command mutations.

## Prove and maintain

Run `bash formal/check.sh Mission reveal`, then `leftover`, `content`, `identity`, and `pipeline` in the same argument position. Expect `RevealBeforeRead` for `reveal`, `InstallResponsiveness` for `identity`, and `InstallSoundness` for `leftover`, `content`, and `pipeline`, not a tool error. The `pipeline` variant trusts final download presence and wrongly awards on `./diag.sh | rm ~/downloads/diag.sh`. Rerun the fixed command afterwards. For each trace, replay the equivalent commands through `Game.run` and compare the affected state, not just stdout; for `pipeline`, compare launch and final download presence as well as credit and feedback. A mismatch means inspect the projection or an excluded command before declaring a product bug. Report a confirmed counterexample, including its commands and affected guard, rather than weakening the property. Use `/maintain-formal-verification-skill` after intentional changes and advance the sync commit only after the step map, tests, counterexamples and charts match the new revision.
