# Missions 01 and 02

The fixed overview is the `/statechart` projection. It collapses cwd, repeated commands, and non-crediting launches that stay in the same display state. The final arrow also requires cwd `~/bin`, intact content, execute permission, and successful relative execution. Completion is sticky.

```mermaid
stateDiagram-v2
  s0: Workspace hidden
  s1: Workspace revealed
  s2: Mission 01 complete
  s3: Download only
  s4: Diagnostic missing
  s5: Both copies present
  s6: Installed, not executable
  s7: Replacement script installed
  s8: Installed and executable
  s9: Mission 02 complete
  [*] --> s0
  s0 --> s1: list hidden workspace entries
  s1 --> s2: read the vault token
  s2 --> s3: select Mission 02
  s3 --> s4: remove download
  s3 --> s5: copy download
  s3 --> s6: move download
  s5 --> s6: move download or remove download
  s5 --> s7: replace installed script
  s6 --> s7: replace installed script
  s6 --> s8: make executable
  s7 --> s5: copy download
  s7 --> s6: move download
  s5 --> s8: remove download
  s8 --> s7: replace installed script
  s8 --> s9: run relative executable
```

## Shortest counterexamples in the broken variants

This view combines only the shortest paths reported for the four variants. Steps 1–4 for the three Mission 02 traces are shared: `ls -a`, read the vault token, select Mission 02, `cd ~/bin`. Red marks the first invariant violation, not a current finding.

```mermaid
stateDiagram-v2
  state "Workspace not revealed" as Hidden
  state "Vault read credited without reveal" as Early
  state "Mission 02: in bin with download only" as Ready
  state "Both copies present" as Copies
  state "Both copies present, installed executable" as CopiesX
  state "Credited with download still present" as Leftover
  state "Installed copy only" as Clean
  state "Installed copy executable" as CleanX
  state "Valid launch not credited" as Identity
  state "Original moved into bin" as Moved
  state "Replaced with echo-only script" as Fake
  state "Replacement executable" as FakeX
  state "Replacement credited" as Spoof
  [*] --> Hidden
  Hidden --> Early: read vault token
  Hidden --> Ready: shared valid setup steps 1–4
  Ready --> Copies: copy download
  Copies --> CopiesX: chmod
  CopiesX --> Leftover: run ./diag.sh
  Copies --> Clean: remove download
  Clean --> CleanX: chmod
  CleanX --> Identity: run ./diag.sh
  Ready --> Moved: move download
  Moved --> Fake: overwrite with echo
  Fake --> FakeX: chmod
  FakeX --> Spoof: run ./diag.sh
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class Early,Leftover,Identity,Spoof breaks
```

- `reveal`: `RevealBeforeRead` breaks on step 1 if `level1.observe` grants credit without the successful workspace reveal.
- `leftover`: `InstallSoundness` breaks on step 7 if `level2.observe` ignores the surviving download. The fixed guard reports the leftover.
- `identity`: `InstallResponsiveness` breaks on step 8 under the old original-object rule. The fixed guard compares content.
- `content`: `InstallSoundness` breaks on step 8 if `level2.observe` trusts stdout alone. The fixed guard checks the installed text.
