# VFS install and root refusal

Fixed `/statechart` overview. The projected states collapse operations that do not visibly change file placement; the appendage “root rejected” represents the last submission, not a separate disk mode. The model exposes the download and installed file modes even in the collapsed “Both files present” state.

```mermaid
stateDiagram-v2
  s0: Download only
  s1: Both files present
  s2: Root rejected, local kept
  s3: Only installed, not executable
  s4: No diagnostic
  s5: Only installed, executable
  [*] --> s0
  s0 --> s1: copy into bin
  s0 --> s2: request removal of local and root
  s0 --> s3: move into bin
  s0 --> s4: remove download
  s1 --> s0: start fresh filesystem
  s1 --> s3: move into bin or remove download
  s1 --> s2: request removal of local and root
  s2 --> s0: start fresh filesystem
  s2 --> s1: copy into bin or make installed file executable
  s2 --> s3: move into bin or remove download
  s2 --> s4: remove download
  s3 --> s0: start fresh filesystem
  s3 --> s5: make installed file executable
  s3 --> s2: request removal of local and root
  s4 --> s0: start fresh filesystem
  s4 --> s2: request removal of local and root
  s1 --> s5: remove download
  s5 --> s0: start fresh filesystem
  s5 --> s2: request removal of local and root
  s2 --> s5: make installed file executable or remove download
```

## Shortest counterexamples in the broken variants

```mermaid
stateDiagram-v2
  state "Download and local file present" as Fresh
  state "Copy and download share mode metadata" as Aliased
  state "Both files became executable" as ModeChanged
  state "Root rejected, but local was deleted" as LocalDeleted
  [*] --> Fresh
  Fresh --> Aliased: copy into bin
  Aliased --> ModeChanged: chmod installed script
  Fresh --> LocalDeleted: request removal of local and root
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class ModeChanged,LocalDeleted breaks
```

- `alias` breaks `CopyIsolatesMetadata` on step 2: `VFS.transfer` shares the file object on `cp`, so `chmod` changes the source too. The actual copy path clones the entry.
- `root` breaks `RootRefusalHasNoSideEffects` on step 1: the local operand was removed before `/` was refused. The actual `commands.rm` preflights every normalized operand.
