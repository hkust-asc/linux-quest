import { element } from "./dom.js";

const cards = {
  filesystem: ["Hierarchical Filesystem", "Files and directories form a tree rooted at /, not at your home directory.", "Linux filesystem tree, root directory", "Try pwd, then ls / and ls ~/. Find where your workspace fits.", "Draw the directory tree affected by this command before suggesting a change."],
  paths: ["Relative vs Absolute Paths", "An absolute path starts at /. A relative path starts at your working directory; ~ expands to home.", "absolute path, relative path, cwd", "Try tldr cd, then use pwd before and after cd ..", "Give both an absolute and a relative path, and name the working directory you assumed."],
  dotfiles: ["Dotfiles", "A leading dot hides a name from default listings. This is a convention, not a permission rule.", "dotfiles, hidden files, ls all", "Run ls --help and compare ls with ls -a.", "Identify any dotfiles this change touches and explain why they matter."],
  help: ["Using --help & tldr", "--help lists usage, man gives reference details, and tldr starts with practical examples.", "CLI documentation, man pages, tldr", "Try ls --help, man ls, and tldr ls. Which one helps you fastest?", "Include a short example and tell me which manual entry verifies each flag."],
  permissions: ["POSIX Permissions", "Read, write, and execute are separate bits for owner, group, and others. Octal 755 gives the owner full access and others read/execute.", "Unix file mode, octal permissions, chmod", "Compare ls -l before and after chmod +x. Check man chmod.", "Suggest the smallest permission change and explain who gains access."],
  "dot-slash": ["Why ./ is Needed", "A slash tells the shell to use a path directly. ./ means the path starts in the current directory.", "shell executable search, current directory", "Try which grep and tldr chmod. Compare ./tool with tool.", "Tell me where to run this command and whether it uses a path or searches PATH."],
  streams: ["Standard Streams", "Programs read stdin and can write normal results to stdout and errors to stderr. > and 2> route different streams.", "file descriptors 0 1 2, redirect stdout stderr", "Try echo test > output.txt and cat output.txt. Use tldr cat for input examples.", "Show where stdin, stdout, and stderr go, and whether existing files get overwritten."],
  pipe: ["Unix Pipe Philosophy", "A pipe feeds one command's stdout into the next command's stdin. Separate small programs can share text without an intermediate file.", "shell pipeline, stdin stdout composition", "Try echo telemetry | wc -l and compare it with echo telemetry.", "Explain what flows through each stage and how errors remain visible."],
  grep: ["grep", "grep selects matching lines. -i ignores case and -v selects nonmatching lines.", "grep substring, grep invert match", "Compare tldr grep and grep --help, then try echo Sensor | grep -i sensor.", "Propose a filter and give one line it should match and one it should not."],
  path: ["PATH / which", "PATH is a colon-separated search list. which reports where an external command would be found.", "PATH search order, executable lookup", "Run env and which grep, then read tldr which.", "Explain where the executable is installed and preserve existing PATH entries."],
  environment: ["Environment Variables & Secrets", "Exported variables are visible to child programs. Real keys should not be pasted into chat, terminal history, or repositories.", "export, environment variables, secret manager", "Read tldr export and inspect the simulated env. Do not copy real environment output into chat.", "Use a placeholder for any secret and explain how to supply it without exposing its value."],
  bashrc: [".bashrc & source", "A shell startup file can hold settings. source applies a file in the current shell; read it first.", "Bash startup files, source, dot command", "Try cat ~/.bashrc, then man source and tldr .", "Show the proposed startup-file change separately and explain when it will take effect."],
  signals: ["Processes & Signals", "A PID identifies a running process. SIGTERM requests orderly exit; SIGKILL stops it without cleanup.", "PID, SIGTERM, SIGKILL", "Use ps aux to check the target and man kill to review the available signals.", "Verify the process owner and command before suggesting a signal. Prefer a graceful stop."],
  "login-node": ["Login vs Compute Node Etiquette", "A login node is a shared entry point. Submit large jobs to compute resources rather than consuming the shared entry point.", "HPC login node, compute allocation, Slurm", "Compare lscpu, free -h, and ps aux. On a real cluster, check site guidance before launching work.", "Identify the node type and propose a resource request instead of a direct heavy launch."],
  hardware: ["Hardware Telemetry", "CPU and memory reports describe available hardware; a process report describes current consumers.", "lscpu, free, nvidia-smi, GPU utilization", "Try lscpu and free -h. On a GPU machine, look up nvidia-smi; it is not simulated here.", "Separate hardware capacity from current use, and tell me which output supports each claim."],
  audit: ["Audit Risky Flags", "Read every flag and target before approving. Recursive forced deletion and an unexpectedly broad target are different risks that compound.", "rm -rf, filesystem root, human approval", "Read rm --help and use pwd and ls to confirm a target independently. Do not execute a suspicious proposal.", "Enumerate all targets, explain each flag, and stop for confirmation before destructive actions."],
  scheduler: ["Submit Work Through a Scheduler", "A scheduler queues a job for requested compute resources. Review the script and confirm that the resource request fits the job.", "Slurm sbatch, ntasks, nodes, batch job", "On a Slurm cluster, try sbatch --help and man sbatch. Act 1 reviews submissions without running them.", "Show the batch script and explain each requested resource before asking for approval."],
};

const sections = ["What it is", "Keywords to Search", "How to Look It Up in CLI", "How to Prompt an AI Agent with It"];
export const cardTitle = id => cards[id][0];

export function showCodex(container, levels, unlocked) {
  container.replaceChildren(...levels.map(level => {
    const group = element("section", undefined, "codex-group");
    group.append(element("h3", `${level.id} / ${level.title}`));
    for (const id of level.cards) {
      const [title, ...content] = cards[id];
      if (!unlocked.includes(id)) {
        group.append(element("p", `${title} · Locked`, "locked-card"));
        continue;
      }
      const card = element("details", undefined, "codex-card");
      card.append(element("summary", title));
      for (const [index, section] of sections.entries()) card.append(element("h4", section), element("p", content[index]));
      group.append(card);
    }
    return group;
  }));
}
