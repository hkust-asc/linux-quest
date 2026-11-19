const commands = {
  pwd: ["print working directory", "show your current location", "pwd"],
  ls: ["list", "list directory entries; -a includes hidden names and -l shows modes", "ls -al ~/workspace"],
  cd: ["change directory", "move to a path; ~ means home, .. means parent, and - means the previous directory", "cd .."],
  cat: ["concatenate", "join and display files or standard input", "cat notes.txt"],
  head: ["head of the input", "show the first ten lines", "head notes.txt"],
  tail: ["tail of the input", "show the last ten lines", "tail notes.txt"],
  mkdir: ["make directory", "create directories; -p makes missing parents", "mkdir -p experiments/output"],
  touch: ["touch a file", "create an empty file if it does not exist", "touch notes.txt"],
  mv: ["move", "move or rename a file or directory", "mv old.txt new.txt"],
  cp: ["copy", "copy a file without moving the original", "cp notes.txt backup.txt"],
  rm: ["remove", "delete permanently; -r descends into directories and -f ignores missing files", "rm old.txt"],
  chmod: ["change mode", "change permissions with +x or an octal mode such as 755", "chmod +x tool.sh"],
  clear: ["clear the screen", "wipe the terminal display without changing files or history", "clear"],
  echo: ["echo back", "write arguments to standard output", 'echo "hello cadet"'],
  grep: ["global regular expression print", "select lines containing a substring; -i ignores case and -v inverts", 'grep -i "target freq" notes.txt'],
  wc: ["word count", "count lines, words, and bytes; -l counts newline characters only", "wc -l notes.txt"],
  env: ["environment", "display exported variables", "env"],
  export: ["export to the environment", "set a variable so programs can see it", 'export PATH="$PATH:$HOME/tools"'],
  which: ["which executable", "show the first matching executable along PATH", "which grep"],
  source: ["read from a source file", "run commands from a file in the current shell; . is an alias", "source ~/.bashrc"],
  ".": ["dot command", "alias for source; run a file in the current shell", ". ~/.bashrc"],
  ps: ["process status", "list processes and CPU use; aux gives a fuller view", "ps aux"],
  kill: ["send a signal", "request exit by PID; -9 sends a forced kill signal", "kill 4821"],
  lscpu: ["list CPU", "inspect the simulated node's processor", "lscpu"],
  free: ["free memory", "inspect memory; -h uses human-readable units", "free -h"],
  man: ["manual", "read a command's reference entry", "man grep"],
  tldr: ["too long; didn't read", "see a short command example", "tldr ls"],
  "diag.sh": ["diagnostic script", "report that the simulated diagnostic passed", "./diag.sh"],
  sensor_dump: ["sensor dump", "emit telemetry on stdout and sensor warnings on stderr", "./sensor_dump"],
  "asc-agent": ["ASC Team agent", "report readiness with --status after the demo environment is configured", "asc-agent --status"],
};

export const lookup = name => Object.hasOwn(commands, name) ? commands[name] : undefined;
export const builtinNames = Object.keys(commands).filter(name => !["diag.sh", "sensor_dump", "asc-agent"].includes(name));

export function describe(name, format) {
  const entry = lookup(name);
  if (!entry) throw new Error(`${name}: no help entry; try tldr ls to see an example`);
  const [origin, purpose, example] = entry;
  if (format === "man") return `NAME\n  ${name} — ${origin}\nDESCRIPTION\n  ${purpose}.\nEXAMPLE\n  ${example}\n`;
  if (format === "tldr") return `${name} (${origin})\n  ${example}\n  ${purpose}.\n`;
  return `${name} — ${origin}\nUsage: ${example}\nUse it to ${purpose}.\n`;
}
