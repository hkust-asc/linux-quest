# Mission 06 proposal review

Fixed `/statechart` overview. A wrong verdict returns feedback and stays at the same proposal, so the projection omits those self-loops.

```mermaid
stateDiagram-v2
  s0: Review recursive deletion
  s1: Review login-node benchmark
  s2: Review scheduler submission
  s3: Review complete
  [*] --> s0
  s0 --> s1: choose Reject
  s1 --> s0: reselect Mission 06
  s1 --> s2: choose Reject
  s2 --> s0: reselect Mission 06
  s2 --> s3: choose Approve
```

## Shortest counterexamples in the broken variants

```mermaid
stateDiagram-v2
  state "Review recursive deletion" as Delete
  state "Wrong verdict accepted" as Advanced
  state "Review login-node benchmark" as Benchmark
  state "Review scheduler submission" as Submit
  state "Approved proposal dispatched" as Dispatched
  [*] --> Delete
  Delete --> Advanced: choose Approve
  Delete --> Benchmark: choose Reject
  Benchmark --> Submit: choose Reject
  Submit --> Dispatched: choose Approve
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class Advanced,Dispatched breaks
```

- `advance` breaks `CorrectDecisionsInOrder` on step 1: `Game.decide` would advance after an incorrect choice. The actual method returns an explanation without advancing.
- `execute` breaks `ProposalsNeverDispatched` on step 3: approving the scheduler proposal would dispatch it. The actual method only advances review state and grants credit.
