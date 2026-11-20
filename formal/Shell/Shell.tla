------------------------------- MODULE Shell -------------------------------
CONSTANT Variant
VARIABLES phase, line, segments, shape, output, workspaceRevealed

Quoted == "echo \"$USER\"_lab"
Adjacent == "echo $USER\"_lab\""
Literal == "echo '$USER'_lab"
Pipeline == "ls -a | cat"
MissingStage == "ls -a |"
MissingTarget == "echo ok >"
Unclosed == "echo \"open"
Echoes == {Quoted, Adjacent, Literal}
Malformed == {MissingStage, MissingTarget}
Invalid == Malformed \cup {Unclosed}

Init ==
  /\ phase = "ready" /\ line = "" /\ segments = <<>> /\ shape = "none"
  /\ output = "" /\ workspaceRevealed = FALSE

Submit ==
  /\ phase = "ready"
  /\ line' \in Echoes \cup Invalid \cup {Pipeline}
  /\ phase' = "submitted"
  /\ UNCHANGED <<segments, shape, output, workspaceRevealed>>

Tokenize ==
  /\ phase = "submitted"
  /\ segments' = CASE line \in {Quoted, Adjacent} ->
                     IF Variant = "quotes" THEN <<"$USER_lab">> ELSE <<"$USER", "_lab">>
                   [] line = Literal -> <<"'$USER'", "_lab">>
                   [] OTHER -> <<>>
  /\ phase' = IF line = Unclosed THEN "lex error" ELSE "tokenized"
  /\ UNCHANGED <<line, shape, output, workspaceRevealed>>

Parse ==
  /\ phase = "tokenized"
  /\ shape' = CASE line \in Malformed -> "invalid"
                [] line = Pipeline -> "pipe"
                [] OTHER -> "single"
  /\ phase' = "parsed"
  /\ UNCHANGED <<line, segments, output, workspaceRevealed>>

Execute ==
  /\ phase = "parsed" /\ shape /= "invalid"
  /\ workspaceRevealed' = (shape = "pipe")
  /\ output' = CASE segments = <<"$USER", "_lab">> -> "cadet_lab"
                 [] segments = <<"'$USER'", "_lab">> -> "$USER_lab"
                 [] shape = "pipe" -> "workspace listing"
                 [] OTHER -> ""
  /\ phase' = "returned"
  /\ UNCHANGED <<line, segments, shape>>

ReturnParseError ==
  /\ (phase = "lex error" \/ (phase = "parsed" /\ shape = "invalid"))
  /\ workspaceRevealed' = (line = MissingStage /\ Variant = "partial")
  /\ output' = "syntax error" /\ phase' = "returned"
  /\ UNCHANGED <<line, segments, shape>>

FreshShell ==
  /\ phase = "returned"
  /\ phase' = "ready" /\ line' = "" /\ segments' = <<>> /\ shape' = "none"
  /\ output' = "" /\ workspaceRevealed' = FALSE
Next == Submit \/ Tokenize \/ Parse \/ Execute \/ ReturnParseError \/ FreshShell

ExpansionKeepsBoundaries ==
  phase = "returned" /\ line \in Echoes => output = (IF line = Literal THEN "$USER_lab" ELSE "cadet_lab")
ParseBeforeEffects ==
  phase = "returned" /\ line \in Invalid => output = "syntax error" /\ ~workspaceRevealed
=============================================================================
