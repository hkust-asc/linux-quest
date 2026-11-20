import { WORKSPACE } from "../vfs.js";

const vault = `${WORKSPACE}/.vault`;
const accessKey = `${vault}/.access_key`;

export default {
  id: 1, title: "Lost in the Tree", visualizer: "tree",
  objective: "A recovery token is tucked inside a hidden directory in your workspace. Reveal the directory, then read the token.",
  hints: [
    "A name beginning with a dot is hidden from normal listings. Try tldr ls.",
    "Use all entries mode with ls, then use cat to read the token. Hidden names can be listed inside the vault too.",
    "Run ls -al and then cat .vault/.access_key.",
  ],
  cards: ["filesystem", "paths", "dotfiles", "help"],
  setup(shell) {
    shell.vfs.mkdir(vault);
    shell.vfs.write(accessKey, "VAULT-READY\n");
    shell.vfs.write(`${WORKSPACE}/mission.txt`, "The recovery token is not in the ordinary listing.\n");
  },
  observe({ shell, state, event, report }) {
    if (event.revealed.includes(WORKSPACE)) state.workspaceRevealed = true;
    if (event.name !== "cat" || !event.reads.includes(accessKey) || !event.stdout) return false;
    if (state.workspaceRevealed === true && shell.revealed.has(WORKSPACE)) return true;
    report("Mission 01: Reveal the hidden entries in ~/workspace with ls -a, then read the token again.");
    return false;
  },
};
