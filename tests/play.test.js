import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/game.js";
import { HOME, WORKSPACE } from "../js/vfs.js";

function playAct(flags, install) {
  const game = new Game();
  const transcript = [];
  const enter = (command, completes = false) => {
    const result = game.run(command);
    assert.equal(result.code, 0, `${command}: ${result.stderr}`);
    assert.equal(result.completed, completes, command);
    transcript.push([game.level.id, command, result.stdout, result.stderr, result.feedback, result.completed]);
    return result;
  };
  const next = id => assert.ok(game.select(id));

  assert.equal(game.select(2), false);
  assert.match(enter("cat .vault/.access_key").feedback.join("\n"), /Reveal.*workspace/);
  assert.match(enter("ls --help").stdout, /ls/);
  assert.match(enter("tldr ls").stdout, /ls/);
  assert.deepEqual(game.shell.complete(".va", false), [".vault/"]);
  assert.match(enter(`ls ${flags}`).stdout, /\.vault/);
  enter("cat .vault/.access_key", true);
  next(2);
  enter(`${install} ~/downloads/diag.sh ~/bin`);
  enter("cd ~/bin");
  enter("chmod +x diag.sh");
  if (install === "cp") {
    for (const attempt of [1, 2]) {
      const result = enter("./diag.sh");
      assert.match(result.stdout, /Diagnostic passed/, `attempt ${attempt}`);
      assert.match(result.feedback.join("\n"), /still exists at ~\/downloads\/diag\.sh/);
      assert.ok(game.shell.vfs.get(`${HOME}/downloads/diag.sh`));
      assert.ok(game.shell.vfs.get(`${HOME}/bin/diag.sh`));
    }
    enter("rm ~/downloads/diag.sh");
  }
  enter("./diag.sh", true);
  next(3);
  enter("./sensor_dump > clean.txt 2> err.log");
  enter("grep TARGET_FREQ clean.txt", true);
  next(4);
  enter('export PATH="$PATH:$HOME"/.local/bin');
  enter('export AGENT_API_KEY="hkust"-demo');
  enter("cd ~/.local/bin");
  assert.match(enter("asc-agent --status").feedback.join("\n"), /Leave ~\/\.local\/bin/);
  enter("cd -");
  enter("asc-agent --status", true);
  next(5);
  enter("lscpu");
  assert.match(enter("kill 4821").feedback.join("\n"), /Select Mission 05 again/);
  next(5);
  enter("lscpu");
  enter("ps aux");
  enter("kill 4821", true);
  next(6);
  enter("echo keep > /tmp/keep");
  for (const [verdict, accepted, completed] of [
    ["approve", false, false], ["reject", true, false],
    ["approve", false, false], ["reject", true, false],
    ["reject", false, false], ["approve", true, true],
  ]) {
    const result = game.decide(verdict);
    assert.equal(result.accepted, accepted);
    assert.equal(result.completed, completed);
    transcript.push([6, verdict, result]);
  }
  assert.deepEqual(game.store.state.completed, [1, 2, 3, 4, 5, 6]);
  assert.equal(game.shell.vfs.file("/tmp/keep").text, "keep\n");
  assert.equal(game.level.reward.title, "Level 1 Clearance Certificate");
  game.reset();
  assert.equal(game.shell.cwd, WORKSPACE);
  assert.equal(game.level.id, 1);
  assert.equal(game.isUnlocked(2), false);
  assert.deepEqual(game.store.state, { completed: [], cards: [], history: [] });
  return transcript;
}

for (const [flags, install] of [["-al", "mv"], ["-la", "cp"], ["-a -l", "mv"]]) {
  test(`deterministic full Act 1 replay: ls ${flags}, ${install} install`, () => {
    assert.deepEqual(playAct(flags, install), playAct(flags, install));
  });
}

test("quoted variable names can be followed by unquoted identifier text", () => {
  const game = new Game();
  assert.equal(game.run('echo "$HOME"suffix').stdout, `${HOME}suffix\n`);
  assert.equal(game.run('echo "$USER"_lab').stdout, "cadet_lab\n");
});

test("malformed submissions never apply valid-looking prefix commands", () => {
  const game = new Game();
  for (const command of ["ls -a |", "ls -a >", 'ls -a "open']) {
    const result = game.run(command);
    assert.equal(result.code, 2);
    assert.deepEqual(result.stages, []);
    assert.equal(game.shell.revealed.has(WORKSPACE), false);
  }
  assert.equal(game.run("cat .vault/.access_key").completed, false);
});
