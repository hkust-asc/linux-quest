---
name: verify-shell-parser
description: Verify Linux X-Ray shell submission when changing tokenizer quote boundaries, variable expansion, pipe and redirect validation, or execution after parse errors.
---

# Shell and parser

From the repository root run `bash formal/check.sh Shell`, then `node --test`. The formal command bootstraps checksum-pinned TLC 1.7.4 and Zulu JRE 21.0.8 on Linux x86_64 (Bash, curl, tar and coreutils; first run needs network). Read every TLA+ result with the pstack `/statechart` skill. Use `formal/Shell/Shell.tla`, `Shell.cfg` and `view.mjs`; compare the overview and close-ups in `charts.md`.

## Code and step boundaries

Sync commit: `f329610ed397e495b31f5849b0ee6da12e3061c7`.

| Model | Implementation |
|---|---|
| `Submit`, `FreshShell` | `Shell.run` entry, `Shell` constructor in `js/shell.js`; each sample starts on a fresh fixture. |
| `Tokenize` | `tokenize` in `js/parser.js`; observe the quoted word's segment boundary or an unclosed quote. The model denotes a literal segment with quotes to separate it from expandable text. |
| `Parse` | `parse` in `js/parser.js`, after tokenization; all stages and redirect targets must be present before any execution. |
| `ReturnParseError`, `Execute` | `Shell.run` error return and stage loop, `expandWord` in `js/parser.js`, `echo`, `ls` and `cat` in `js/commands.js`. `output` removes the final newline and abstracts listing contents. |

These are synchronous internal function/phase boundaries of one submission, not separately schedulable player steps. Seven fixed input shapes cover double-quoted and single-quoted adjacency, one valid pipeline, missing stage, missing target and unclosed quote. `USER=cadet`, `USER_lab` absent; no other Bash grammar, commands, stdin, redirection effects on valid input, tab-completion or nested scripts are proved. `tests/play.test.js` and `tests/contracts.test.js` replay the behavior and vary variable names, suffixes and escaping.

## Prove and maintain

Run `bash formal/check.sh Shell quotes` and `bash formal/check.sh Shell partial`. Expect `ExpansionKeepsBoundaries` and `ParseBeforeEffects` violations respectively; a parser/tool error is not proof. Rerun the baseline. Replay the shortest lines via `Game.run`, check both stdout and whether `shell.revealed` changed. The `quotes` variant reproduces merging adjacent expandable segments; `partial` is a hypothetical prefix execution regression. If a trace disagrees with JS, check the abstraction of segment flags or parser phase before treating it as a finding. Do not relax the invariants to make findings disappear. Use `/maintain-formal-verification-skill` and advance the sync commit only after checking the new code, properties, tests and charts against each other.
