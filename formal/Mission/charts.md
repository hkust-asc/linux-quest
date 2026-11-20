# Missions 01 and 02

The fixed overview is the `/statechart` projection. It collapses cwd, execute permission when both copies exist, and steps that stay in the same display state. Both arrows to Mission 02 completion require cwd `~/bin`, intact content, execute permission, and successful relative execution with no download at launch. Completion is sticky.

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
  s3 --> s4: remove download or remove download, then launch or launch, then remove download
  s3 --> s5: copy download
  s3 --> s6: move download
  s5 --> s6: move download or remove download or remove download, then launch or launch, then remove download
  s5 --> s7: replace installed script
  s6 --> s7: replace installed script
  s6 --> s8: make executable
  s7 --> s5: copy download
  s7 --> s6: move download
  s5 --> s8: remove download or launch, then remove download
  s8 --> s7: replace installed script
  s5 --> s9: remove download, then launch
  s8 --> s9: run relative executable
```

## Shortest counterexamples in the broken variants

This view combines only the shortest paths reported by `/statechart` for the four earlier variants. Steps 1–4 for the three Mission 02 traces are shared: `ls -a`, read the vault token, select Mission 02, `cd ~/bin`. Red marks the first invariant violation, not a current finding.

```mermaid
stateDiagram-v2
  state "Workspace not revealed" as Hidden
  state "Vault read credited without reveal" as Early
  state "Mission 02: in bin with download only" as Ready
  state "Both copies present" as Copies
  state "Both copies present, installed executable" as CopiesX
  state "Credited with download still present" as Leftover
  state "Valid launch not credited" as Identity
  state "Replaced with echo-only script" as Fake
  state "Replacement executable" as FakeX
  state "Replacement credited" as Spoof
  [*] --> Hidden
  Hidden --> Early: read vault token
  Hidden --> Ready: shared valid setup steps 1–4
  Ready --> Copies: copy download
  Copies --> CopiesX: chmod
  CopiesX --> Leftover: run ./diag.sh
  CopiesX --> Identity: remove download, then run ./diag.sh
  Copies --> Fake: overwrite with echo
  Fake --> FakeX: chmod
  FakeX --> Spoof: remove download, then run ./diag.sh
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class Early,Leftover,Identity,Spoof breaks
```

- `reveal`: `RevealBeforeRead` breaks on step 1 if `level1.observe` grants credit without the successful workspace reveal.
- `leftover`: `InstallSoundness` breaks on step 7 if `level2.observe` ignores the surviving download. The fixed guard reports the leftover.
- `identity`: `InstallResponsiveness` breaks on step 7 under the old original-object rule. The fixed guard compares content.
- `content`: `InstallSoundness` breaks on step 8 if `level2.observe` trusts stdout alone. The fixed guard checks the installed text. The standalone checker can choose an equally short trace using `mv` and a single-stage launch.

## Pipeline close-up: download presence at launch

The red endpoint is the shortest `pipeline` counterexample (seven submissions or selections after initialization). The other two endpoints show the fixed results from the same prepared state. In all three endpoints the download is gone after the pipeline.

```mermaid
stateDiagram-v2
  state "Workspace hidden" as Hidden
  state "Workspace revealed" as Revealed
  state "Mission 01 complete" as Token
  state "Download only, in workspace" as Download
  state "Download only, in bin" as Ready
  state "Both copies present" as Copies
  state "Both copies present, installed executable" as CopiesX
  state "Credited after a late pipeline removal" as Late
  state "No credit, leftover feedback" as Blocked
  state "Mission 02 complete" as Complete
  [*] --> Hidden
  Hidden --> Revealed: ls -a
  Revealed --> Token: cat .vault/.access_key
  Token --> Download: select Mission 02
  Download --> Ready: cd ~/bin
  Ready --> Copies: copy download to ~/bin
  Copies --> CopiesX: chmod +x diag.sh
  CopiesX --> Late: broken launch then remove
  CopiesX --> Blocked: fixed launch then remove
  CopiesX --> Complete: fixed remove then launch
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class Late breaks
```

- `LaunchThenRemove` (`./diag.sh | rm ~/downloads/diag.sh`) records a present `last.launchDownload` but an empty final `download`. The broken variant awards using the final value and violates `InstallSoundness`.
- `Shell.run` captures `event.vfsAtExecution` after opening redirects and immediately before executing the stage. `level2.observe` uses that evidence rather than the live VFS when `Game.run` visits the stages. It reports the leftover and rejects the late removal.
- `RemoveThenLaunch` (`rm ~/downloads/diag.sh | ./diag.sh`) records an empty `last.launchDownload`; the same install qualifies and receives credit. See `InstallResponsiveness`. Feedback itself is covered by the JS tests, not the model.
