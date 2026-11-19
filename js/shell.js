import { commands, pathCommands } from "./commands.js";
import { basename, createVFS, HOME, resolvePath, WORKSPACE } from "./vfs.js";
import { builtinNames, describe, lookup } from "./etymology.js";
import { expandWord, parse, parseFlags, tokenize } from "./parser.js";

export { parse, parseFlags, tokenize, builtinNames };

const pathOperands = new Set(["ls", "cd", "cat", "head", "tail", "mkdir", "touch", "mv", "cp", "rm", "wc", "source", "."]);

export const baseProcesses = [
  { pid: 101, cpu: 0.1, memory: 12, name: "cadet-shell" },
  { pid: 207, cpu: 0.4, memory: 24, name: "telemetryd" },
];

export class Shell {
  constructor({ vfs = createVFS(), cwd = WORKSPACE, processes = baseProcesses } = {}) {
    this.vfs = vfs;
    this.cwd = cwd;
    this.previous = null;
    this.env = Object.assign(Object.create(null), { HOME, USER: "cadet", PATH: "/usr/bin:/bin" });
    this.processes = processes.map(proc => ({ ...proc }));
    this.revealed = new Set();
    this.depth = 0;
  }

  path(value) {
    return resolvePath(value, this.cwd);
  }

  get prompt() {
    const path = this.cwd === HOME || this.cwd.startsWith(`${HOME}/`) ? `~${this.cwd.slice(HOME.length)}` : this.cwd;
    return `cadet@asc-node:${path}$ `;
  }

  get pathDirectories() {
    return this.env.PATH.split(":").map(path => this.path(path));
  }

  executable(path) {
    const entry = this.vfs.get(path);
    return entry?.type === "file" && Boolean(entry.mode & 0o100);
  }

  find(name) {
    if (name.includes("/")) {
      const path = this.path(name);
      return this.executable(path) ? path : null;
    }
    for (const directory of this.pathDirectories) {
      const path = resolvePath(name, directory);
      if (this.executable(path) || (directory === "/usr/bin" && pathCommands.has(name))) return path;
    }
    return null;
  }

  complete(fragment, commandPosition) {
    if (commandPosition && !fragment.includes("/")) {
      const programs = this.pathDirectories.flatMap(directory => this.vfs.get(directory)?.type === "directory"
        ? this.vfs.list(directory).filter(path => this.executable(path)).map(basename) : []);
      return [...new Set([...builtinNames, ...programs])].filter(name => name.startsWith(fragment)).sort();
    }
    const slash = fragment.lastIndexOf("/");
    const prefix = fragment.slice(0, slash + 1);
    const query = fragment.slice(slash + 1);
    const directory = this.path(prefix || ".");
    if (this.vfs.get(directory)?.type !== "directory") return [];
    return this.vfs.list(directory).filter(path => {
      const name = basename(path);
      return name.startsWith(query) && (!name.startsWith(".") || query.startsWith(".") || this.revealed.has(directory));
    }).map(path => `${prefix}${basename(path)}${this.vfs.get(path).type === "directory" ? "/" : ""}`);
  }

  runFile(text) {
    if (this.depth >= 8) throw new Error("script nesting limit reached");
    this.depth++;
    const result = { stdout: "", stderr: "", code: 0 };
    try {
      for (const line of text.split("\n")) {
        if (!line.trim() || line.trimStart().startsWith("#")) continue;
        const step = this.run(line);
        result.stdout += step.stdout;
        result.stderr += step.stderr;
        result.code = step.code;
      }
      return result;
    } finally {
      this.depth--;
    }
  }

  execute(event) {
    const { name, args, stdin } = event;
    const direct = name.includes("/");
    const localPath = direct ? this.path(name) : this.find(name);
    const file = localPath ? this.vfs.get(localPath) : null;
    const builtin = !direct && Object.hasOwn(commands, name);
    if ((builtin || this.executable(localPath)) && parseFlags(args).flags.has("help") && lookup(basename(name))) {
      event.help = true;
      return describe(basename(name), "help");
    }
    if (builtin) return commands[name](this, args, stdin, event);
    if (!file) throw new Error(`${name}: command not found. Try tldr ls or <command> --help for known commands.`);
    if (!this.executable(localPath)) throw new Error(`${name}: permission denied`);
    event.executed = localPath;
    return file.program ? file.program(this, args, stdin) : this.runFile(file.text);
  }

  run(input) {
    const result = { stdout: "", stderr: "", code: 0, stages: [], clear: false };
    let stages;
    try {
      stages = parse(input);
    } catch (error) {
      return { ...result, stderr: `${error.message}\n`, code: 2 };
    }
    let stdin = "";
    for (const [index, stage] of stages.entries()) {
      const [name, ...args] = stage.words.map(word => expandWord(word, this.env));
      const event = { name, args, cwd: this.cwd, stdin, stdout: "", stderr: "", code: 0, reads: [], revealed: [], writes: [] };
      result.stages.push(event);
      const sinks = {};
      try {
        for (const redirect of stage.redirects) {
          const stream = redirect.operator === "2>" ? "stderr" : "stdout";
          const path = this.path(expandWord(redirect.target, this.env));
          const write = this.vfs.openOutput(path, redirect.operator === ">>");
          sinks[stream] = { stream, path, operator: redirect.operator, write };
        }
        const output = this.execute(event);
        if (typeof output === "string") event.stdout = output;
        else if (output) Object.assign(event, output);
      } catch (error) {
        event.stderr = `${error.message}\n`;
        event.code = 1;
      }
      const visible = { stdout: event.stdout, stderr: event.stderr };
      for (const { stream, path, operator, write } of Object.values(sinks)) {
        write(event[stream]);
        event.writes.push({ stream, path, operator, text: event[stream] });
        visible[stream] = "";
      }
      stdin = visible.stdout;
      if (index === stages.length - 1) result.stdout = stdin;
      result.stderr += visible.stderr;
      result.code = event.code;
      result.clear ||= Boolean(event.clear);
    }
    return result;
  }
}

export function xray(input, cwd = WORKSPACE, host = "asc-node") {
  let command = "";
  let expectTarget = false;
  const tokens = tokenize(input, { partial: true });
  return tokens.map(token => {
    const { value } = token;
    let type = "argument";
    if (token.type === "operator") {
      type = "operator";
      if (value === "|") command = "";
      else expectTarget = true;
    } else if (expectTarget) {
      type = "path";
      expectTarget = false;
    } else if (!command) {
      command = value;
      type = host.startsWith("login-node") && basename(command) === "hpl_benchmark" ? "danger" : "command";
    } else if (command === "rm" && resolvePath(value, cwd) === "/") {
      type = "danger";
    } else if ((command === "rm" && (/^-[rf]+$/.test(value) || /^--(recursive|force)$/.test(value)))
      || (host.startsWith("login-node") && basename(command) === "hpl_benchmark" && (value.startsWith("--threads") || /^\d+$/.test(value)))) {
      type = "danger";
    } else if (/^[-+][-\w]/.test(value)) {
      type = "flag";
    } else if (value.includes("/") || value.startsWith(".") || value.startsWith("~") || pathOperands.has(command)) {
      type = "path";
    }
    return { ...token, type, label: input.slice(token.start, token.end), origin: type === "command" ? lookup(basename(command))?.[0] : undefined };
  });
}
