export const title = "Shell command submission";

export function state(current) {
  if (current.phase === "ready") return "Fresh terminal";
  if (current.phase === "submitted") return "Line submitted";
  if (current.phase === "lex error") return "Unclosed quote";
  if (current.phase === "tokenized") return "Word boundaries captured";
  if (current.phase === "parsed") {
    return { invalid: "Malformed shape", pipe: "Two stages parsed", single: "Single stage parsed" }[current.shape];
  }
  if (current.output === "syntax error") {
    return current.workspaceRevealed ? "Syntax error after a side effect" : "Syntax error, no stages run";
  }
  if (!current.output) return "Variable name swallowed the suffix";
  return current.shape === "pipe" ? "Listing passed through cat" : "Echo returned";
}

const labels = {
  Submit: "submit command",
  Tokenize: "read words and operators",
  Parse: "validate command shape",
  Execute: "expand and run",
  ReturnParseError: "return syntax error",
  FreshShell: "start fresh shell",
};

export const step = action => labels[action];
