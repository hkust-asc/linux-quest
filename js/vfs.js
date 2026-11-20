export const HOME = "/home/cadet";
export const WORKSPACE = `${HOME}/workspace`;

export function resolvePath(path, cwd = WORKSPACE) {
  const expanded = path === "~" || path.startsWith("~/") ? HOME + path.slice(1) : path;
  const parts = [];
  for (const part of (expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`).split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export const basename = path => path.split("/").at(-1) || "/";
export const dirname = path => path.slice(0, path.lastIndexOf("/")) || "/";

export class VFS {
  entries = new Map([["/", { type: "directory", mode: 0o755 }]]);

  get(path) {
    return this.entries.get(path);
  }

  mkdir(path, parents = false) {
    if (this.get(path)) {
      if (parents && this.get(path).type === "directory") return;
      throw new Error(`${path}: already exists`);
    }
    if (parents && !this.get(dirname(path))) this.mkdir(dirname(path), true);
    this.requireDirectory(dirname(path));
    this.entries.set(path, { type: "directory", mode: 0o755 });
  }

  requireDirectory(path) {
    if (this.get(path)?.type !== "directory") throw new Error(`${path}: not a directory`);
  }

  list(path) {
    this.requireDirectory(path);
    return [...this.entries.keys()].filter(entry => entry !== path && dirname(entry) === path).sort();
  }

  file(path) {
    const entry = this.get(path);
    if (entry?.type !== "file") throw new Error(`${path}: not a file`);
    return entry;
  }

  write(path, text = "", { append = false, mode = 0o644, program } = {}) {
    if (path === "/dev/null") return;
    this.requireDirectory(dirname(path));
    const existing = this.get(path);
    if (existing) {
      this.file(path).text = append ? existing.text + text : text;
      if (text || !append) delete existing.program;
    } else {
      this.entries.set(path, { type: "file", mode, text, program });
    }
  }

  openOutput(path, append) {
    if (path === "/dev/null") return () => {};
    this.write(path, "", { append });
    const entry = this.file(path);
    return text => {
      entry.text += text;
      if (text) delete entry.program;
    };
  }

  transfer(from, to, move) {
    const entry = this.get(from);
    if (!entry) throw new Error(`${from}: no such file or directory`);
    if (this.get(to)?.type === "directory") to = resolvePath(basename(from), to);
    if (from === to || from === "/" || to.startsWith(`${from}/`)) throw new Error("invalid destination");
    this.requireDirectory(dirname(to));
    if (this.get(to)?.type === "directory") throw new Error(`${to}: directory already exists`);
    if (entry.type === "directory" && !move) throw new Error(`${from}: cp only copies files`);
    for (const [path, item] of [...this.entries]) {
      if (path !== from && !path.startsWith(`${from}/`)) continue;
      this.entries.set(to + path.slice(from.length), move ? item : { ...item });
      if (move) this.entries.delete(path);
    }
  }

  remove(path, { recursive, force } = {}) {
    if (path === "/") throw new Error("refusing to remove the simulated root");
    const entry = this.get(path);
    if (!entry && !force) throw new Error(`${path}: no such file or directory`);
    if (entry?.type === "directory" && !recursive) throw new Error(`${path}: is a directory (requires -r)`);
    for (const key of this.entries.keys()) {
      if (key === path || key.startsWith(`${path}/`)) this.entries.delete(key);
    }
  }
}

export function createVFS() {
  const vfs = new VFS();
  for (const path of [WORKSPACE, `${HOME}/bin`, `${HOME}/downloads`, `${HOME}/.local/bin`, "/usr/bin", "/bin", "/tmp", "/dev"]) {
    vfs.mkdir(path, true);
  }
  vfs.write(`${HOME}/.bashrc`, "# Cadet shell settings\n");
  return vfs;
}
