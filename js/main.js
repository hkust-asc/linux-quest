import { cardTitle, showCodex } from "./codex.js";
import { drawChips, element } from "./dom.js";
import { Game } from "./game.js";
import { tokenize, xray } from "./shell.js";
import { envView } from "./visualizers/envView.js";
import { procView } from "./visualizers/procView.js";
import { streamView } from "./visualizers/streamView.js";
import { treeView } from "./visualizers/treeView.js";

const byId = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch {}
const game = new Game(storage);
const input = byId("command");
const output = byId("output");
const tabs = [...byId("tabs").querySelectorAll("button")];
const views = { tree: treeView, streams: streamView, env: envView, processes: procView };
let activeView;
let lastResult;
let verdictMessage;
let historyIndex;
let draft;

function appendOutput(text, tone) {
  if (!text) return;
  output.append(element("pre", text.replace(/\n$/, ""), tone));
  output.scrollTop = output.scrollHeight;
}

function refreshProgress() {
  const { completed, cards } = game.store.state;
  byId("progress").max = game.levels.length;
  byId("progress").value = completed.length;
  byId("progress-label").textContent = `${completed.length} / ${game.levels.length} Missions`;
  byId("badge").textContent = cards.length;
  byId("missions").replaceChildren(...game.levels.map(level => {
    const done = game.isComplete(level.id);
    const unlocked = game.isUnlocked(level.id);
    const state = done ? "Complete" : unlocked ? "Unlocked" : "Locked";
    const button = element("button", `${String(level.id).padStart(2, "0")} · ${state}`, done ? "done" : "");
    button.type = "button";
    button.disabled = !unlocked;
    button.title = level.title;
    button.setAttribute("aria-label", `Mission ${level.id}: ${level.title} — ${state}`);
    if (level.id === game.level.id) button.setAttribute("aria-current", "step");
    button.addEventListener("click", () => { if (game.select(level.id)) startMission(); });
    return button;
  }));
  const done = game.isComplete(game.level.id);
  const hasNext = game.levels.indexOf(game.level) < game.levels.length - 1;
  byId("mission-complete").hidden = !done || !hasNext;
  byId("mission-status").textContent = done ? "COMPLETE" : "IN PROGRESS";
  byId("mission-status").classList.toggle("done", done);
}

function renderAudit(focusVerdict = false) {
  const audit = byId("audit");
  const certificate = byId("certificate");
  audit.replaceChildren();
  certificate.replaceChildren();
  audit.hidden = !game.level.proposals;
  certificate.hidden = !game.level.reward || !game.isComplete(game.level.id);
  if (audit.hidden) return;
  const proposal = game.proposal;
  let firstButton;
  if (proposal) {
    audit.append(element("h3", `AGENT PROPOSAL ${game.proposalIndex + 1} / ${game.level.proposals.length}`));
    if (proposal.host) audit.append(element("p", `Simulated execution context: ${proposal.host}`));
    const chips = element("div", undefined, "chips");
    drawChips(chips, xray(proposal.command, game.shell.cwd, proposal.host));
    audit.append(chips);
    const buttons = element("div", undefined, "verdict-buttons");
    for (const verdict of ["reject", "approve"]) {
      const button = element("button", verdict === "approve" ? "Approve proposal" : "Reject proposal");
      button.type = "button";
      button.addEventListener("click", () => {
        const result = game.decide(verdict);
        verdictMessage = `${result.accepted ? "Correct" : "Try again"} — ${result.explanation}`;
        refreshProgress();
        renderAudit(true);
      });
      firstButton ??= button;
      buttons.append(button);
    }
    audit.append(buttons);
  }
  const feedback = element("p", verdictMessage ?? "");
  feedback.setAttribute("role", "status");
  audit.append(feedback);
  if (!proposal && !verdictMessage) audit.hidden = true;
  if (!certificate.hidden) {
    const list = element("ul");
    list.append(...game.store.state.cards.map(id => element("li", cardTitle(id))));
    certificate.append(element("h3", game.level.reward.title), element("h4", "Unlocked Known Unknowns"),
      list, element("p", game.level.reward.teaser));
    certificate.tabIndex = -1;
  }
  if (focusVerdict) (firstButton ?? certificate).focus();
}

function showView(name) {
  activeView = name;
  for (const tab of tabs) {
    const selected = tab.dataset.view === name;
    tab.setAttribute("aria-selected", selected);
    tab.tabIndex = selected ? 0 : -1;
    if (selected) byId("view").setAttribute("aria-labelledby", tab.id);
  }
  byId("view").replaceChildren(...views[name](game.shell, lastResult));
}

function renderXray(command) {
  const chips = xray(command, game.shell.cwd);
  drawChips(byId("xray"), chips);
  if (!chips.length) byId("xray").append(element("span", "Type a command to inspect its parts", "fog"));
}

function resetHistoryCursor() {
  historyIndex = game.store.state.history.length;
  draft = "";
}

function startMission() {
  const { id, title, objective, hints, visualizer } = game.level;
  byId("mission-index").textContent = `MISSION ${String(id).padStart(2, "0")} / ${String(game.levels.length).padStart(2, "0")}`;
  byId("mission-title").textContent = title;
  byId("objective").textContent = objective;
  byId("hints").open = false;
  const list = byId("hint-list");
  list.replaceChildren();
  function addHint(index) {
    if (index >= hints.length) return;
    const button = element("button", `Reveal hint ${index + 1}`);
    button.type = "button";
    button.addEventListener("click", () => {
      const hint = element("p", `${index + 1}. ${hints[index]}`);
      button.replaceWith(hint);
      addHint(index + 1);
      hint.tabIndex = -1;
      hint.focus();
    });
    list.append(button);
  }
  addHint(0);
  verdictMessage = undefined;
  lastResult = undefined;
  resetHistoryCursor();
  refreshProgress();
  renderAudit();
  showView(visualizer);
  output.replaceChildren();
  appendOutput("Cadet shell ready. Try tldr ls or <command> --help.", "system");
  input.value = "";
  byId("prompt").textContent = game.shell.prompt;
  renderXray("");
  input.focus();
}

function viewFor(result) {
  if (result.stages.length > 1 || result.stages.some(stage => stage.writes.length || ["grep", "wc"].includes(stage.name))) return "streams";
  const name = result.stages[0]?.name;
  if (["cd", "pwd", "ls", "cat", "mkdir", "touch", "mv", "cp", "rm", "chmod"].includes(name)) return "tree";
  if (["env", "export", "which", "source", ".", "asc-agent"].includes(name)) return "env";
  if (["ps", "kill", "lscpu", "free"].includes(name)) return "processes";
  return activeView;
}

byId("command-form").addEventListener("submit", event => {
  event.preventDefault();
  const command = input.value;
  const prompt = game.shell.prompt;
  lastResult = game.run(command);
  if (lastResult.clear) output.replaceChildren();
  else appendOutput(prompt + command, "typed");
  appendOutput(lastResult.stdout, "stdout");
  appendOutput(lastResult.stderr, "stderr");
  if (lastResult.completed) {
    appendOutput("Mission complete. New cards are available in the Codex.", "success");
    refreshProgress();
  }
  byId("prompt").textContent = game.shell.prompt;
  showView(viewFor(lastResult));
  renderXray(command);
  input.value = "";
  resetHistoryCursor();
});

function autocomplete() {
  const cursor = input.selectionStart;
  if (cursor !== input.selectionEnd) return false;
  const before = input.value.slice(0, cursor);
  const tokens = tokenize(before, { partial: true });
  const last = tokens.at(-1);
  const current = last?.end === cursor && last.type === "word" ? last : null;
  const prior = current ? tokens.at(-2) : last;
  if (!current && (!prior || prior.value === "|")) return false;
  const matches = game.shell.complete(current?.value ?? "", !prior || prior.value === "|");
  if (!matches.length) return false;
  if (matches.length > 1) appendOutput(matches.join("  "), "system");
  else {
    const escaped = matches[0].replace(/[\\\s"'$|>]/g, "\\$&");
    const completed = escaped + (matches[0].endsWith("/") ? "" : " ");
    input.setRangeText(completed, current?.start ?? cursor, cursor, "end");
    renderXray(input.value);
  }
  return true;
}

input.addEventListener("input", () => renderXray(input.value));
input.addEventListener("keydown", event => {
  const { history } = game.store.state;
  if (event.ctrlKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    output.replaceChildren();
  } else if (event.key === "Tab" && !event.shiftKey && autocomplete()) {
    event.preventDefault();
  } else if (["ArrowUp", "ArrowDown"].includes(event.key) && history.length) {
    event.preventDefault();
    if (historyIndex === history.length) draft = input.value;
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
    input.value = history[historyIndex] ?? draft;
    input.setSelectionRange(input.value.length, input.value.length);
    renderXray(input.value);
  }
});

for (const tab of tabs) tab.addEventListener("click", () => showView(tab.dataset.view));
byId("tabs").addEventListener("keydown", event => {
  const current = tabs.indexOf(event.target);
  if (current < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
    : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  showView(tabs[next].dataset.view);
  tabs[next].focus();
});
byId("next").addEventListener("click", () => {
  const next = game.levels[game.levels.indexOf(game.level) + 1];
  if (next && game.select(next.id)) startMission();
});
byId("reset").addEventListener("click", () => {
  if (window.confirm("Reset all missions, Codex cards, and terminal history?")) {
    game.reset();
    startMission();
  }
});
byId("open-codex").addEventListener("click", () => {
  showCodex(byId("codex-entries"), game.levels, game.store.state.cards);
  byId("codex").showModal();
});
startMission();
