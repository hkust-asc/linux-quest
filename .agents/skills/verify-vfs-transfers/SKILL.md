---
name: verify-vfs-transfers
description: Verify Linux X-Ray VFS isolation or root protection when changing copy, move, remove, path normalization, or mode mutations used by Mission 02.
---

# VFS install and root refusal

From the repository root run `bash formal/check.sh VFS`, then `node --test`. The formal command bootstraps checksum-pinned TLC 1.7.4 and Zulu JRE 21.0.8 on Linux x86_64 (Bash, curl, tar and coreutils; first run needs network). Read every TLA+ result with the pstack `/statechart` skill. Use `formal/VFS/VFS.tla`, `VFS.cfg` and `view.mjs`; compare the overview and close-ups in `charts.md`.

## Code and step boundaries

Sync commit: `f329610ed397e495b31f5849b0ee6da12e3061c7`.

| Model | Implementation |
|---|---|
| `MoveDownload`, `CopyDownload` | `commands.mv` and `cp` in `js/commands.js` delegate to `VFS.transfer` in `js/vfs.js`; copy clones the file entry, move preserves it. |
| `ChmodInstalled`, `RemoveDownload` | `commands.chmod` mutates entry mode, `commands.rm` calls `VFS.remove`. |
| `RemoveLocalAndRoot` | `Shell.path` and `resolvePath` normalize operands; `commands.rm` checks every target before deletion; `VFS.remove` independently refuses `/`. |
| `ResetFixture` | A new `Shell` with `createVFS` plus `level2.setup` and the local fixture. No implication about persistence. |

One action is a whole synchronous command or fixture reset. Bounds are the root, one local file, diagnostic download and installed paths, mode `0644`/`0755`, and modeled aliasing. Copy isolation is checked via a bin chmod while the download still exists. Root refusal covers the local-first representative; the JS structural matrix also tests reversed and normalized root operands. No directories are transferred, the download is not chmodded directly, and no symlinks, invalid non-root operands, pipeline redirection, unrelated metadata or operating-system I/O are modeled. This is not a guarantee of transactional behavior for all errors.

## Prove and maintain

`bash formal/check.sh VFS alias` must violate `CopyIsolatesMetadata`; `bash formal/check.sh VFS root` must violate `RootRefusalHasNoSideEffects`. Restore with the baseline command. Replay both shortest paths in `Game.run`; before judging, compare normalized operands, file modes, and existence of the local file. These variants replace the copy clone with shared metadata or skip the root preflight; they are not current implementation findings. Keep a real finding if the code reproduces it. Use `/maintain-formal-verification-skill` and advance the sync commit only after revalidating the step map, test matrix and charts.
