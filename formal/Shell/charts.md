# Shell submission

Fixed `/statechart` overview. Internal phases run synchronously inside a single submission. The exit through syntax error does not enter the stage loop.

```mermaid
stateDiagram-v2
  s0: Fresh terminal
  s1: Line submitted
  s2: Word boundaries captured
  s3: Unclosed quote
  s4: Single stage parsed
  s5: Malformed shape
  s6: Two stages parsed
  s7: Syntax error, no stages run
  s8: Echo returned
  s9: Listing passed through cat
  [*] --> s0
  s0 --> s1: submit command
  s1 --> s2: read words and operators
  s1 --> s3: read words and operators
  s2 --> s4: validate command shape
  s3 --> s7: return syntax error
  s2 --> s5: validate command shape
  s2 --> s6: validate command shape
  s4 --> s8: expand and run
  s5 --> s7: return syntax error
  s6 --> s9: expand and run
  s7 --> s0: start fresh shell
  s8 --> s0: start fresh shell
  s9 --> s0: start fresh shell
```

## Shortest counterexamples in the broken variants

```mermaid
stateDiagram-v2
  state "Fresh terminal" as Ready
  state "Variable and adjacent suffix submitted" as Quoted
  state "Variable and suffix merged into one name" as Joined
  state "Single stage parsed" as Single
  state "Echo returns an empty value" as Empty
  state "Line ending with a pipe submitted" as Pipeline
  state "Pipe operator recognized" as Tokenized
  state "Trailing stage missing" as Invalid
  state "Syntax error after revealing workspace" as Effect
  [*] --> Ready
  Ready --> Quoted: submit adjacent suffix
  Quoted --> Joined: tokenize
  Joined --> Single: parse
  Single --> Empty: expand and execute
  Ready --> Pipeline: submit incomplete pipe
  Pipeline --> Tokenized: tokenize
  Tokenized --> Invalid: parse
  Invalid --> Effect: return error after running prefix
  classDef breaks fill:#ffe4e4,stroke:#b42318,color:#8a1b13
  class Empty,Effect breaks
```

- `quotes` breaks `ExpansionKeepsBoundaries` on step 4: `tokenize` merges `$USER` with `_lab`; `expandWord` tries to expand `USER_lab`. Quote delimiters now end the segment. `echo "$USER"_lab` and `echo $USER"_lab"` are equivalent witnesses.
- `partial` breaks `ParseBeforeEffects` on step 4: `ls -a |` reports a syntax error after applying `ls -a`. The actual `Shell.run` parses the entire line before entering its execution loop.
