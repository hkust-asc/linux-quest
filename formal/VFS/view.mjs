export const title = "VFS install and root refusal";

export function state(current) {
  if (!current.local) return "Root rejected after deleting local";
  if (current.download === "0755") return "Installed chmod changed the download";
  if (current.last.operand === "/") return "Root rejected, local kept";
  if (current.installed === "absent") return current.download === "absent" ? "No diagnostic" : "Download only";
  if (current.download !== "absent") return "Both files present";
  return current.installed === "0755" ? "Only installed, executable" : "Only installed, not executable";
}

const labels = {
  MoveDownload: "move into bin",
  CopyDownload: "copy into bin",
  ChmodInstalled: "make installed file executable",
  RemoveDownload: "remove download",
  RemoveLocalAndRoot: "request removal of local and root",
  ResetFixture: "start fresh filesystem",
};

export function step(action, before, after) {
  if (action === "Transfer") return after.last.command === "cp" ? labels.CopyDownload : labels.MoveDownload;
  return labels[action];
}
