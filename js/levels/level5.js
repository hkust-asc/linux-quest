const runaway = { pid: 4821, cpu: 99.3, memory: 1536, name: "stress_matmul" };

export default {
  id: 5, title: "Save the Login Node", visualizer: "processes",
  objective: "Inspect the login node's hardware, identify the runaway matrix job in the process list, and stop it by PID.",
  hints: [
    "Login nodes are shared. Check the hardware first, then compare CPU usage across processes. Try tldr ps.",
    "Use lscpu or free, find the process with ps, then use kill with its PID. Try the default signal before considering force.",
    "Run lscpu, ps aux, then kill 4821.",
  ],
  cards: ["signals", "login-node", "hardware"],
  setup(shell) { shell.processes.push({ ...runaway }); },
  observe({ shell, state, event }) {
    if (["lscpu", "free"].includes(event.name)) state.hardware = true;
    if (event.seenPids?.includes(runaway.pid)) state.located = true;
    if (event.killed === runaway.pid && state.located) state.stopped = true;
    return state.hardware && state.stopped && !shell.processes.some(proc => proc.pid === runaway.pid);
  },
};
