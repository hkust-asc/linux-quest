import { describe } from "./etymology.js";
import { parseFlags } from "./parser.js";
import { basename, HOME } from "./vfs.js";

const line = value => `${value}\n`;
const lines = text => text.replace(/\n$/, "").split("\n");
const modeLabel = ({ type, mode }) => (type === "directory" ? "d" : "-")
  + Array.from({ length: 9 }, (_, bit) => mode & (1 << (8 - bit)) ? "rwx"[bit % 3] : "-").join("");

function requireArgs(args, count, usage) {
  if (args.length < count) throw new Error(`usage: ${usage}`);
}

function readInput(shell, args, stdin, event) {
  return args.length ? args.map(arg => {
    const path = shell.path(arg);
    const text = shell.vfs.file(path).text;
    event.reads.push(path);
    return text;
  }).join("") : stdin;
}

export const commands = {
  pwd: shell => line(shell.cwd),
  ls(shell, args, stdin, event) {
    const { flags, operands } = parseFlags(args);
    return (operands.length ? operands : ["."]).map(arg => {
      const path = shell.path(arg);
      if (shell.vfs.get(path)?.type === "file") {
        return line(flags.has("l") ? `${modeLabel(shell.vfs.file(path))}  ${basename(path)}` : basename(path));
      }
      const entries = shell.vfs.list(path);
      if (flags.has("a")) {
        shell.revealed.add(path);
        event.revealed.push(path);
      }
      return entries.filter(entry => flags.has("a") || !basename(entry).startsWith("."))
        .map(entry => line(flags.has("l") ? `${modeLabel(shell.vfs.get(entry))}  ${basename(entry)}` : basename(entry))).join("");
    }).join("");
  },
  cd(shell, args) {
    const target = args[0] === "-" ? shell.previous : shell.path(args[0] ?? HOME);
    if (!target) throw new Error("cd: no previous directory");
    shell.vfs.requireDirectory(target);
    [shell.cwd, shell.previous] = [target, shell.cwd];
    return args[0] === "-" ? line(shell.cwd) : "";
  },
  cat: readInput,
  head: (shell, args, stdin, event) => readInput(shell, args, stdin, event).match(/[^\n]*\n|[^\n]+$/g)?.slice(0, 10).join("") ?? "",
  tail: (shell, args, stdin, event) => readInput(shell, args, stdin, event).match(/[^\n]*\n|[^\n]+$/g)?.slice(-10).join("") ?? "",
  mkdir(shell, args) {
    const { flags, operands } = parseFlags(args);
    requireArgs(operands, 1, "mkdir [-p] directory");
    for (const arg of operands) shell.vfs.mkdir(shell.path(arg), flags.has("p"));
  },
  touch(shell, args) {
    requireArgs(args, 1, "touch file");
    for (const arg of args) if (!shell.vfs.get(shell.path(arg))) shell.vfs.write(shell.path(arg));
  },
  mv(shell, args) {
    requireArgs(args, 2, "mv source destination");
    shell.vfs.transfer(shell.path(args[0]), shell.path(args[1]), true);
  },
  cp(shell, args) {
    requireArgs(args, 2, "cp source destination");
    shell.vfs.transfer(shell.path(args[0]), shell.path(args[1]), false);
  },
  rm(shell, args) {
    const { flags, operands } = parseFlags(args);
    if (!flags.has("f")) requireArgs(operands, 1, "rm [-rf] target");
    const paths = operands.map(arg => shell.path(arg));
    if (paths.includes("/")) throw new Error("rm: refusing to remove the simulated root");
    for (const path of paths) shell.vfs.remove(path, { recursive: flags.has("r"), force: flags.has("f") });
  },
  chmod(shell, args) {
    requireArgs(args, 2, "chmod mode file");
    const [mode, ...files] = args;
    if (mode !== "+x" && !/^[0-7]{3}$/.test(mode)) throw new Error("chmod: use +x or a three-digit octal mode");
    for (const file of files) {
      const entry = shell.vfs.get(shell.path(file));
      if (!entry) throw new Error(`${file}: does not exist`);
      entry.mode = mode === "+x" ? entry.mode | 0o111 : Number.parseInt(mode, 8);
    }
  },
  clear(shell, args, stdin, event) { event.clear = true; },
  echo: (shell, args) => line(args.join(" ")),
  grep(shell, args, stdin, event) {
    const { flags, operands } = parseFlags(args);
    requireArgs(operands, 1, "grep [-iv] pattern [file]");
    const [pattern, ...files] = operands;
    const text = readInput(shell, files, stdin, event);
    const normalize = value => flags.has("i") ? value.toLowerCase() : value;
    const matches = text ? lines(text).filter(value => normalize(value).includes(normalize(pattern)) !== flags.has("v")) : [];
    if (!matches.length) event.code = 1;
    return matches.map(line).join("");
  },
  wc(shell, args, stdin, event) {
    const { flags, operands } = parseFlags(args);
    const text = readInput(shell, operands, stdin, event);
    const count = (text.match(/\n/g) ?? []).length;
    return line(flags.has("l") ? count : `${count} ${(text.match(/\S+/g) ?? []).length} ${new TextEncoder().encode(text).length}`);
  },
  env: shell => Object.entries(shell.env).map(([key, value]) => line(`${key}=${value}`)).join(""),
  export(shell, args) {
    if (!args.length) return commands.env(shell);
    for (const arg of args) {
      const assignment = arg.match(/^([a-z_]\w*)=([\s\S]*)$/i);
      if (!assignment) throw new Error("export: expected KEY=VALUE");
      shell.env[assignment[1]] = assignment[2];
    }
  },
  which(shell, args) {
    requireArgs(args, 1, "which command");
    const path = shell.find(args[0]);
    if (!path) throw new Error(`${args[0]}: not found on PATH`);
    return line(path);
  },
  source(shell, args) {
    requireArgs(args, 1, "source file");
    return shell.runFile(shell.vfs.file(shell.path(args[0])).text);
  },
  ".": (...args) => commands.source(...args),
  ps(shell, args, stdin, event) {
    event.seenPids = shell.processes.map(proc => proc.pid);
    const full = args.includes("aux");
    return line(full ? "USER     PID  %CPU   MEM    COMMAND" : "PID  %CPU  COMMAND") + shell.processes.map(proc =>
      line(full ? `cadet   ${proc.pid}   ${proc.cpu}%  ${proc.memory} MiB   ${proc.name}` : `${proc.pid}   ${proc.cpu}%   ${proc.name}`)).join("");
  },
  kill(shell, args, stdin, event) {
    const { flags, operands } = parseFlags(args);
    if ([...flags].some(flag => flag !== "9")) throw new Error("kill: only -9 is supported in addition to the default signal");
    requireArgs(operands, 1, "kill [-9] pid");
    const pid = Number(operands[0]);
    const proc = shell.processes.find(item => item.pid === pid);
    if (!proc) throw new Error(`kill: ${operands[0]}: no such process`);
    shell.processes = shell.processes.filter(item => item !== proc);
    event.killed = pid;
    return line(`Sent ${flags.has("9") ? "SIGKILL" : "SIGTERM"} to ${pid} (${proc.name}).`);
  },
  lscpu: () => "Architecture: x86_64\nCPU(s): 4\nModel name: Simulated Virtual CPU\n",
  free: (shell, args) => parseFlags(args).flags.has("h")
    ? "           total    used    free\nMem:      8.0Gi   2.0Gi   6.0Gi\nSwap:     1.0Gi      0B   1.0Gi\n"
    : "           total      used      free\nMem:     8388608   2097152   6291456\nSwap:    1048576         0   1048576\n",
  man(shell, args) {
    requireArgs(args, 1, "man command");
    return describe(basename(args[0]), "man");
  },
  tldr(shell, args) {
    requireArgs(args, 1, "tldr command");
    return describe(basename(args[0]), "tldr");
  },
};

export const pathCommands = new Set(["ls", "cat", "head", "tail", "mkdir", "touch", "mv", "cp", "rm",
  "chmod", "grep", "wc", "env", "which", "ps", "kill", "lscpu", "free", "man", "tldr", "clear", "echo", "pwd"]);
