import { HOME } from "../vfs.js";

const localBin = `${HOME}/.local/bin`;
const agent = `${localBin}/asc-agent`;
const demoKey = "hkust-demo";
const ready = "ASC Agent ready / online. Demo environment verified.\n";

export default {
  id: 4, title: "Awaken the CLI Agent", visualizer: "env",
  objective: "Make the agent in ~/.local/bin discoverable on PATH. Export the training value AGENT_API_KEY=hkust-demo, then request the agent's status by name from outside its install directory.",
  hints: [
    "The shell searches PATH left to right. Try tldr which to see how to test the search.",
    "Export a PATH that keeps its current directories and adds the agent directory. Export the demo variable too. Settings in ~/.bashrc take effect in this session after source.",
    'Run export PATH="$PATH:$HOME/.local/bin", export AGENT_API_KEY=hkust-demo, then asc-agent --status.',
  ],
  cards: ["path", "environment", "bashrc"],
  setup(shell, state) {
    shell.vfs.write(agent, "# Simulated ASC Team agent\n", {
      mode: 0o755,
      program(current, args) {
        if (current.env.AGENT_API_KEY !== demoKey) return { stderr: "asc-agent: missing or invalid AGENT_API_KEY (use the mission's demo value).\n", code: 1 };
        if (!args.includes("--status")) return { stderr: "asc-agent: try --status or --help.\n", code: 1 };
        return ready;
      },
    });
    state.original = shell.vfs.file(agent);
  },
  observe({ shell, state, event, report }) {
    if (event.executed !== agent || event.stdout !== ready || !event.args.includes("--status")) return false;
    const missing = [];
    if (event.name !== "asc-agent") missing.push("Run asc-agent --status by name, without a path.");
    if (event.cwd === localBin) missing.push("Leave ~/.local/bin before requesting status.");
    if (shell.vfs.get(agent) !== state.original) missing.push("Select Mission 04 again to restore the original agent.");
    if (!shell.pathDirectories.includes(localBin)) missing.push("Add ~/.local/bin to PATH.");
    if (shell.env.AGENT_API_KEY !== demoKey) missing.push("Export the mission's demo value for AGENT_API_KEY.");
    for (const message of missing) report(`Mission 04: ${message}`);
    return !missing.length;
  },
};
