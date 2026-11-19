import { HOME } from "../vfs.js";

const localBin = `${HOME}/.local/bin`;
const agent = `${localBin}/asc-agent`;
const demoKey = "hkust-demo";

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
        return "ASC Agent ready / online. Demo environment verified.\n";
      },
    });
    state.original = shell.vfs.file(agent);
  },
  observe({ shell, state, event }) {
    return event.name === "asc-agent" && event.executed === agent && event.args.includes("--status")
      && shell.vfs.get(agent) === state.original && event.cwd !== localBin
      && shell.pathDirectories.includes(localBin) && shell.env.AGENT_API_KEY === demoKey;
  },
};
