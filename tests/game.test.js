import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import { builtinNames, Shell, tokenize, xray } from "../js/shell.js";
import { HOME, WORKSPACE, resolvePath } from "../js/vfs.js";
import { storageKey } from "../js/storage.js";

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}

function run(game, commands) {
  for (const command of commands) {
    const result = game.run(command);
    assert.equal(result.code, 0, `${command}: ${result.stderr}`);
  }
}

function unlocked(id) {
  const game = new Game(new MemoryStorage());
  for (const level of game.levels.slice(0, id - 1)) game.store.complete(level.id, level.cards);
  assert.equal(game.select(id), true);
  return game;
}

test("tokenizer handles quoting, adjacent redirects, and combined ls flags", () => {
  const shell = new Shell();
  shell.vfs.write(`${WORKSPACE}/.hidden`, "hidden\n");
  assert.deepEqual(tokenize('echo "hello cadet">greeting 2>err').map(token => token.value),
    ["echo", "hello cadet", ">", "greeting", "2>", "err"]);
  const listings = ["ls -al", "ls -la", "ls -a -l"].map(command => shell.run(command).stdout);
  assert.equal(listings[0], listings[1]);
  assert.equal(listings[1], listings[2]);
  assert.match(listings[0], /\.hidden/);
  assert.doesNotMatch(shell.run("ls").stdout, /\.hidden/);
  assert.equal(shell.run('echo "hello cadet"').stdout, "hello cadet\n");
  assert.equal(shell.run("echo '$HOME'").stdout, "$HOME\n");
  assert.equal(shell.run('echo "unfinished').code, 2);
});

test("cd handles root, home and previous directory", () => {
  const shell = new Shell();
  shell.run("cd /");
  shell.run("cd ..");
  assert.equal(shell.cwd, "/");
  shell.run("cd ~");
  assert.equal(shell.cwd, HOME);
  shell.run("cd -");
  assert.equal(shell.cwd, "/");
  assert.equal(resolvePath("../../..", "/"), "/");
});

test("all supported commands have --help, man, and tldr documentation", () => {
  const shell = new Shell();
  shell.vfs.write(`${WORKSPACE}/diag.sh`, "", { mode: 0o755 });
  shell.vfs.write(`${WORKSPACE}/sensor_dump`, "", { mode: 0o755 });
  shell.vfs.write(`${WORKSPACE}/asc-agent`, "", { mode: 0o755 });
  for (const name of [...builtinNames, "diag.sh", "sensor_dump", "asc-agent"]) {
    for (const command of [`man ${name}`, `tldr ${name}`, `${builtinNames.includes(name) ? name : `./${name}`} --help`]) {
      const result = shell.run(command);
      assert.equal(result.code, 0, `${command}: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(name.replace(".", "\\.")));
    }
  }
  assert.match(shell.run("unknown-command").stderr, /command not found/);
  assert.equal(shell.run("unknown-command --help").code, 1);
});

test("level 1 reveals and reads vault with ls -al and -la solutions", () => {
  for (const flags of ["-al", "-la", "-a -l"]) {
    const game = unlocked(1);
    assert.doesNotMatch(game.run("ls").stdout, /\.vault/);
    assert.ok(!game.shell.revealed.has(WORKSPACE));
    assert.match(game.run(`ls ${flags}`).stdout, /\.vault/);
    assert.ok(game.shell.revealed.has(WORKSPACE));
    run(game, flags === "-la" ? ["cd .vault", "cat .access_key"] : ["cat .vault/.access_key"]);
    assert.ok(game.isComplete(1));
    assert.equal(game.store.state.cards.length, 4);
  }
});

test("level 2 requires original script moved, executable, and run as ./", () => {
  for (const variant of [
    ["mv ~/downloads/diag.sh ~/bin", "cd ~/bin", "chmod +x diag.sh", "./diag.sh"],
    ["cd ~/downloads", "mv diag.sh /home/cadet/bin/", "chmod 755 ~/bin/diag.sh", "cd ../bin", "./diag.sh"],
  ]) {
    const game = unlocked(2);
    assert.match(game.run("~/downloads/diag.sh").stderr, /permission denied/);
    run(game, variant);
    assert.ok(game.isComplete(2));
  }
  const game = unlocked(2);
  run(game, ["cp ~/downloads/diag.sh ~/bin", "cd ~/bin", "chmod +x diag.sh", "./diag.sh"]);
  assert.equal(game.isComplete(2), false);
});

test("level 3 separates stdout and stderr and extracts a frequency", () => {
  for (const variant of [
    ["./sensor_dump > clean.txt 2> err.log", "grep TARGET_FREQ clean.txt"],
    ["./sensor_dump 2>err.log >./clean.txt", "./sensor_dump 2>/dev/null | grep -i target_freq > found.txt"],
  ]) {
    const game = unlocked(3);
    run(game, variant);
    assert.ok(game.isComplete(3));
    const clean = game.shell.vfs.file(`${WORKSPACE}/clean.txt`).text;
    const errors = game.shell.vfs.file(`${WORKSPACE}/err.log`).text;
    assert.match(clean, /TARGET_FREQ: 4\.2GHz/);
    assert.doesNotMatch(clean, /ERROR|WARN/);
    assert.match(errors, /ERROR/);
    assert.doesNotMatch(errors, /TARGET_FREQ/);
  }
  const game = unlocked(3);
  run(game, ["./sensor_dump > clean.txt 2> err.log", 'echo "TARGET_FREQ: 4.2GHz" | grep TARGET_FREQ']);
  assert.equal(game.isComplete(3), false);
});

test("level 4 requires PATH, exported demo key, and invocation by name", () => {
  for (const variant of [
    ['export PATH="$PATH:$HOME/.local/bin"', "export AGENT_API_KEY=hkust-demo", "asc-agent --status"],
    ["echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc", "echo 'export AGENT_API_KEY=hkust-demo' >> ~/.bashrc",
      ". ~/.bashrc", "which asc-agent", "asc-agent --status"],
  ]) {
    const game = unlocked(4);
    assert.match(game.run("asc-agent --status").stderr, /command not found/);
    assert.match(game.run("~/.local/bin/asc-agent --status").stderr, /missing or invalid/);
    run(game, variant);
    assert.ok(game.isComplete(4));
  }
  const game = unlocked(4);
  run(game, ['export PATH="$PATH:$HOME/.local/bin"', "export AGENT_API_KEY=hkust-demo", "~/.local/bin/asc-agent --status"]);
  assert.equal(game.isComplete(4), false);
});

test("level 5 needs hardware inspection, PID discovery and termination", () => {
  for (const variant of [["lscpu", "ps aux", "kill 4821"], ["free -h", "ps", "kill -9 4821"]]) {
    const game = unlocked(5);
    assert.match(game.shell.run("ps aux").stdout, /4821.*stress_matmul/);
    run(game, variant);
    assert.ok(game.isComplete(5));
    assert.doesNotMatch(game.run("ps").stdout, /4821/);
  }
  const game = unlocked(5);
  run(game, ["lscpu", "kill 4821", "ps"]);
  assert.equal(game.isComplete(5), false);
});

test("level 6 requires ordered correct decisions and highlights dangerous tokens", () => {
  const game = unlocked(6);
  assert.equal(game.decide("approve").accepted, false);
  assert.equal(game.proposalIndex, 0);
  assert.equal(game.isComplete(6), false);
  const first = xray(game.proposal.command);
  assert.ok(first.some(token => token.value === "/" && token.type === "danger"));
  assert.ok(first.some(token => token.value === "-rf" && token.type === "danger"));
  assert.equal(game.decide("reject").accepted, true);
  const second = xray(game.proposal.command, WORKSPACE, game.proposal.host);
  assert.ok(second.some(token => token.value === "--threads" && token.type === "danger"));
  assert.equal(game.decide("reject").accepted, true);
  assert.equal(game.decide("approve").completed, true);
  assert.ok(game.isComplete(6));
  assert.equal(game.decide("approve"), null);
});

test("reset clears persisted progress, cards, and history and relocks missions", () => {
  const storage = new MemoryStorage();
  const persisted = new Game(storage);
  run(persisted, ["ls -a", "cat .vault/.access_key"]);
  assert.ok(persisted.isUnlocked(2));
  assert.ok(storage.getItem(storageKey));
  assert.ok(new Game(storage).isUnlocked(2));
  persisted.reset();
  assert.equal(storage.getItem(storageKey), null);
  assert.deepEqual(persisted.store.state, { completed: [], cards: [], history: [] });
  assert.equal(persisted.isUnlocked(2), false);
  assert.equal(new Game(storage).isUnlocked(2), false);
  assert.equal(persisted.level.id, 1);
});

test("filesystem, redirection, filters, source and completion work in the sandbox", () => {
  const shell = new Shell();
  for (const command of ["mkdir -p a/b", "touch a/b/empty", "echo hello > a/b/note", "echo again >> a/b/note",
    "cp a/b/note a/copy", "mv a/copy a/renamed", "chmod 755 a/renamed"]) {
    assert.equal(shell.run(command).code, 0, command);
  }
  assert.equal(shell.run("cat a/renamed").stdout, "hello\nagain\n");
  assert.equal(shell.run("head a/renamed").stdout, "hello\nagain\n");
  assert.equal(shell.run("tail a/renamed").stdout, "hello\nagain\n");
  assert.equal(shell.run('grep -iv "HELLO" a/renamed | wc -l').stdout, "1\n");
  assert.equal(shell.run("cat missing 2> a/error").code, 1);
  assert.match(shell.run("cat a/error").stdout, /not a file/);
  assert.equal(shell.run("rm -rf a").code, 0);
  assert.equal(shell.vfs.get(`${WORKSPACE}/a`), undefined);
  assert.equal(shell.run("rm -rf /").code, 1);
  assert.ok(shell.complete("ls", true).includes("ls"));
  assert.ok(shell.complete("../", false).includes("../workspace/"));
  assert.equal(shell.run("clear").clear, true);
});

test("redirects are opened before execution even when the target is moved", () => {
  const shell = new Shell();
  shell.run("echo previous > old");
  assert.equal(shell.run("mv old new > old").code, 0);
  assert.equal(shell.vfs.get(`${WORKSPACE}/old`), undefined);
  assert.equal(shell.vfs.file(`${WORKSPACE}/new`).text, "");
});
