import { HOME, isExecutable, resolvePath } from "../vfs.js";

const download = `${HOME}/downloads/diag.sh`;
const bin = `${HOME}/bin`;
const installed = `${bin}/diag.sh`;
const success = "Diagnostic passed: simulated node is ready.";
const diagnostic = `#!/bin/sh\necho '${success}'\n`;

export default {
  id: 2, title: "Permission Denied", visualizer: "tree",
  objective: "Install diag.sh in ~/bin so it no longer remains in ~/downloads. Make it executable, then run ./diag.sh from ~/bin.",
  hints: [
    "A file can be readable but not executable. Try tldr chmod.",
    "Move the script with mv (or copy it and remove the download), set its execute permission with chmod, then cd into ~/bin. Sourcing it would bypass the permission lesson.",
    "Run mv ~/downloads/diag.sh ~/bin, cd ~/bin, chmod +x diag.sh, then ./diag.sh.",
  ],
  cards: ["permissions", "dot-slash"],
  setup(shell) {
    shell.vfs.write(download, diagnostic);
  },
  observe({ event, report }) {
    if (!event.stdout.includes(success)) return false;
    const path = event.executed ?? (
      ["source", "."].includes(event.name) && event.args[0] ? resolvePath(event.args[0], event.cwd) : null
    );
    if (path !== installed && path !== download) return false;

    const missing = [];
    const installedAtLaunch = event.vfsAtExecution.get(installed);
    if (event.vfsAtExecution.get(download)) missing.push("A copy still exists at ~/downloads/diag.sh.");
    if (installedAtLaunch?.text !== diagnostic) {
      missing.push("Install the downloaded diagnostic script, unchanged, at ~/bin/diag.sh.");
    } else if (!isExecutable(installedAtLaunch)) {
      missing.push("Make ~/bin/diag.sh executable with chmod +x.");
    }
    if (event.cwd !== bin) missing.push("Change to ~/bin before running the script.");
    if (event.executed !== installed || !event.name.startsWith("./")) {
      missing.push("Launch the installed script as ./diag.sh from ~/bin.");
    }
    if (!missing.length) return true;
    for (const message of missing) report(`Mission 02: ${message}`);
    return false;
  },
};
