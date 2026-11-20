export const title = "Missions 01 and 02";

export function state(current) {
  if (current.level === 1) {
    if (current.tokenRead && !current.revealed) return "Token credited before reveal";
    if (current.tokenRead) return "Mission 01 complete";
    return current.revealed ? "Workspace revealed" : "Workspace hidden";
  }
  if (current.last.awarded && current.download) return "Credited with download still present";
  if (current.last.awarded && current.installed === "echo only") return "Replacement script credited";
  if (current.complete) return "Mission 02 complete";
  if (current.installed === "absent") return current.download ? "Download only" : "Diagnostic missing";
  if (current.installed === "echo only") return "Replacement script installed";
  if (current.download) return "Both copies present";
  if (!current.executable) return "Installed, not executable";
  if (!current.last.awarded && current.last.name === "./diag.sh" && current.last.path && current.installed === "copied") {
    return "Copy cleaned up but successful launch not credited";
  }
  return "Installed and executable";
}

const labels = {
  RevealWorkspace: "list hidden workspace entries",
  ReadTokenAt: "read the vault token",
  SelectMission02: "select Mission 02",
  MoveDownload: "move download",
  CopyDownload: "copy download",
  RemoveDownload: "remove download",
  SetExecuteBit: "make executable",
  OverwriteWithEcho: "replace installed script",
  ChangeToBin: "enter personal bin",
  ChangeToWorkspace: "return to workspace",
  LaunchRelative: "run relative executable",
  LaunchAbsolute: "run absolute executable",
  SourceDiagnostic: "source the script",
};

export function step(action, before, after) {
  if (action === "Transfer") return after.download ? labels.CopyDownload : labels.MoveDownload;
  if (action === "ChangeDirectory") return after.cwd.endsWith("/bin") ? labels.ChangeToBin : labels.ChangeToWorkspace;
  if (action === "RunDiagnostic") {
    if (after.last.name.startsWith("source ")) return labels.SourceDiagnostic;
    return after.last.name.startsWith("./") ? labels.LaunchRelative : labels.LaunchAbsolute;
  }
  return labels[action];
}
