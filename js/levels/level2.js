import { HOME } from "../vfs.js";

const download = `${HOME}/downloads/diag.sh`;
const bin = `${HOME}/bin`;
const installed = `${bin}/diag.sh`;
const success = "Diagnostic passed: simulated node is ready.";

export default {
  id: 2, title: "Permission Denied", visualizer: "tree",
  objective: "Install the downloaded diagnostic in your personal bin, make it executable, and launch it from that directory with a relative executable path.",
  hints: [
    "A file can be readable but not executable. Try tldr chmod.",
    "Move the script with mv, set its execute permission with chmod, then cd into ~/bin. Running it with bash would bypass the permission lesson.",
    "Run mv ~/downloads/diag.sh ~/bin, cd ~/bin, chmod +x diag.sh, then ./diag.sh.",
  ],
  cards: ["permissions", "dot-slash"],
  setup(shell, state) {
    shell.vfs.write(download, `#!/bin/sh\necho '${success}'\n`);
    state.original = shell.vfs.file(download);
  },
  observe({ shell, state, event }) {
    return event.cwd === bin && event.name.startsWith("./") && event.executed === installed
      && !shell.vfs.get(download) && shell.vfs.get(installed) === state.original && shell.executable(installed)
      && event.stdout.includes(success);
  },
};
