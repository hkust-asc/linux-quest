export default {
  id: 6, title: "Human-in-the-Loop Audit", visualizer: "processes",
  objective: "Review each proposal before granting permission. Nothing in this review is executed. Decide which proposals are safe for this simulated cluster.",
  hints: [
    "Read every argument, not just the command name. Think about where each command would run.",
    "Check recursive deletes and root paths, then distinguish a workload launched on a login node from a submission to a scheduler.",
    "Reject the delete, reject the direct benchmark, and approve the scheduler submission.",
  ],
  cards: ["audit", "scheduler"],
  proposals: [
    {
      command: "rm -rf /tmp/build_cache /", verdict: "reject",
      explanation: "The trailing / is a second target. Recursive, forced deletion must never target the filesystem root.",
    },
    {
      command: "./hpl_benchmark --threads 128", host: "login-node-01", verdict: "reject",
      explanation: "A heavy 128-thread workload would compete with everyone on a shared login node. Request compute resources instead.",
    },
    {
      command: "sbatch --nodes=1 --ntasks=16 run_hpl.slurm", verdict: "approve",
      explanation: "This proposal requests compute resources through the scheduler rather than running the benchmark on the login node.",
    },
  ],
  reward: {
    title: "Level 1 Clearance Certificate",
    teaser: "Act 2: Your coach will issue an onboarding card after Act 1. No connection details are included in this simulation.",
  },
};
