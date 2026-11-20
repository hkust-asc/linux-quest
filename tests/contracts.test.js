import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import level1 from "../js/levels/level1.js";
import level2 from "../js/levels/level2.js";
import level3 from "../js/levels/level3.js";
import level4 from "../js/levels/level4.js";
import level5 from "../js/levels/level5.js";
import { Shell } from "../js/shell.js";
import { expandWord, tokenize } from "../js/parser.js";
import { HOME, WORKSPACE } from "../js/vfs.js";

test("Level 2 observer needs only execution evidence, not the live shell or file identity", () => {
  const bin = `${HOME}/bin`;
  const download = `${HOME}/downloads/diag.sh`;
  const installed = `${bin}/diag.sh`;
  const success = "Diagnostic passed: simulated node is ready.";
  for (const [condition, breakCondition, guidance] of [
    ["all requirements", () => {}, null],
    ["exclusive install", ({ shell, text }) => shell.vfs.write(download, text), /still exists/],
    ["diagnostic content", ({ shell }) => shell.vfs.write(installed, ""), /unchanged/],
    ["execute bit", ({ shell }) => { shell.vfs.file(installed).mode = 0o644; }, /chmod/],
    ["working directory", ({ event }) => { event.cwd = WORKSPACE; }, /Change to/],
    ["relative invocation", ({ event }) => { event.name = installed; }, /Launch/],
    ["execution, not sourcing", ({ event }) => {
      Object.assign(event, { executed: undefined, name: ".", args: [installed] });
    }, /Launch/],
  ]) {
    const shell = new Shell();
    level2.setup(shell);
    const { text } = shell.vfs.file(download);
    shell.vfs.remove(download);
    shell.vfs.write(installed, text, { mode: 0o755 });
    const event = { cwd: bin, name: "./diag.sh", executed: installed, stdout: success };
    const feedback = [];
    breakCondition({ shell, text, event });
    event.vfsAtExecution = shell.vfs.snapshot();
    assert.equal(level2.observe({ event, report: message => feedback.push(message) }), !guidance, condition);
    if (guidance) assert.match(feedback.join("\n"), guidance, condition);
    else assert.deepEqual(feedback, [], condition);
    event.stdout = "";
    assert.equal(level2.observe({ event, report: assert.fail }), false, `${condition}: no success output`);
  }
});

test("stage filesystem evidence reflects execution after redirect setup and before mutations", () => {
  const shell = new Shell();
  const path = `${WORKSPACE}/note`;
  for (const command of ["chmod +x note", "rm note"]) {
    assert.equal(shell.run("echo original > note").code, 0);
    const result = shell.run(`${command} | echo replacement > note`);
    assert.deepEqual(result.stages.map(stage => stage.code), [0, 0]);
    const [beforeMutation, afterRedirect] = result.stages.map(stage => stage.vfsAtExecution.get(path));
    assert.deepEqual([beforeMutation.text, beforeMutation.mode], ["original\n", 0o644]);
    assert.deepEqual([afterRedirect.text, afterRedirect.mode], ["", command.startsWith("chmod") ? 0o755 : 0o644]);
    assert.equal(shell.vfs.file(path).text, "replacement\n");
    assert.ok(Object.isFrozen(beforeMutation));
    assert.ok(Object.isFrozen(afterRedirect));
    shell.vfs.remove(path);
  }
});

test("ordered-evidence gates report the unmet prerequisite rather than treating successful actions as wins", () => {
  for (const [level, commands, guidance] of [
    [level1, ["cat .vault/.access_key", "ls -a .vault | cat .access_key", "ls -a .vault | cat .vault/.access_key"], /Reveal/],
    [level5, ["kill 4821", "kill -9 4821", "ps | kill 4821"], /Select Mission 05 again/],
  ]) {
    for (const command of commands) {
      const game = new Game(undefined, [level]);
      const result = game.run(command);
      if (command === "ps | kill 4821") {
        assert.deepEqual(result.feedback, [], command);
        assert.ok(game.state.stopped, command);
      } else if (command.includes("| cat .access_key")) {
        assert.equal(result.code, 1, command);
        assert.deepEqual(result.feedback, [], command);
      } else {
        assert.equal(result.code, 0, command);
        assert.match(result.feedback.join("\n"), guidance, command);
        assert.doesNotMatch(result.stdout, guidance, command);
      }
      assert.equal(result.completed, false, command);
    }
  }
});

test("quote and escape boundaries never extend a bare variable name into the next segment", () => {
  const env = { HOME, USER: "cadet", PATH: "/usr/bin:/bin" };
  for (const [name, value] of Object.entries(env)) {
    for (const suffix of ["suffix", "_lab", "7", "a7"]) {
      for (const word of [`"$${name}"${suffix}`, `$${name}"${suffix}"`, `$${name}'${suffix}'`, `$${name}\\${suffix}`]) {
        const [token] = tokenize(word);
        assert.equal(expandWord(token, env), value + suffix, word);
      }
    }
  }
});

test("Level 3 needs both independent pieces of stream evidence, in either order", () => {
  const route = "./sensor_dump > clean.txt 2> err.log";
  const extract = "./sensor_dump 2>/dev/null | grep TARGET_FREQ";
  for (const pair of [[route, extract], [extract, route]]) {
    const game = new Game(undefined, [level3]);
    assert.equal(game.run(pair[0]).completed, false);
    assert.equal(game.run(pair[1]).completed, true);
  }
});

test("successful agent status reports each missing invocation prerequisite", () => {
  for (const [setup, launch, guidance] of [
    [[], "~/.local/bin/asc-agent --status", [/by name/, /Add .*PATH/]],
    [["cd ~/.local/bin"], 'export PATH="$PATH:$HOME/.local/bin" | asc-agent --status', [/Leave/]],
    [['export PATH="$PATH:$HOME/.local/bin"', "cp ~/.local/bin/asc-agent /tmp/agent",
      "mv /tmp/agent ~/.local/bin/asc-agent"], "asc-agent --status", [/restore the original/]],
  ]) {
    const game = new Game(undefined, [level4]);
    game.run("export AGENT_API_KEY=hkust-demo");
    for (const command of setup) assert.equal(game.run(command).code, 0, command);
    const result = game.run(launch);
    assert.match(result.stdout, /Demo environment verified/);
    assert.equal(result.completed, false);
    for (const message of guidance) assert.match(result.feedback.join("\n"), message);
  }
});

test("VFS copies isolate metadata; any root operand in rm rejects the whole command", () => {
  for (const flags of ["-rf", "-fr", "-r -f"]) {
    for (const operands of ["local /", "/ local", "local /tmp/.."]) {
      const game = new Game();
      game.run("echo keep > local");
      const before = [...game.shell.vfs.entries];
      assert.equal(game.run(`rm ${flags} ${operands}`).code, 1);
      assert.deepEqual([...game.shell.vfs.entries], before);
    }
  }
  for (const mode of ["+x", "755"]) {
    const game = new Game(undefined, [level2]);
    game.run("cp ~/downloads/diag.sh ~/bin");
    game.run(`chmod ${mode} ~/bin/diag.sh`);
    assert.equal(game.shell.executable(`${HOME}/bin/diag.sh`), true);
    assert.equal(game.shell.executable(`${HOME}/downloads/diag.sh`), false);
  }
});

test("audit decisions cannot dispatch a shell command, for any verdict at each proposal", () => {
  const game = new Game(undefined, [new Game().levels.at(-1)]);
  game.shell.run = assert.fail;
  for (const expected of ["reject", "reject", "approve"]) {
    assert.equal(game.decide("later"), null);
    assert.equal(game.decide(expected === "approve" ? "reject" : "approve").accepted, false);
    assert.equal(game.decide(expected).accepted, true);
  }
  assert.equal(game.decide("approve"), null);
});
