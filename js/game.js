import { levels } from "./levels/index.js";
import { Shell } from "./shell.js";
import { progressStore } from "./storage.js";

export class Game {
  constructor(storage, registry = levels) {
    this.levels = registry;
    this.store = progressStore(storage);
    this.select(registry.find(level => !this.isComplete(level.id) && this.isUnlocked(level.id))?.id ?? registry.at(-1).id);
  }

  isComplete(id) {
    return this.store.state.completed.includes(id);
  }

  isUnlocked(id) {
    const index = this.levels.findIndex(level => level.id === id);
    return index >= 0 && (index === 0 || this.isComplete(this.levels[index - 1].id));
  }

  select(id) {
    if (!this.isUnlocked(id)) return false;
    this.level = this.levels.find(level => level.id === id);
    this.shell = new Shell(this.level.snapshot);
    this.state = {};
    this.proposalIndex = this.isComplete(id) ? this.level.proposals?.length ?? 0 : 0;
    this.level.setup?.(this.shell, this.state);
    return true;
  }

  complete() {
    if (this.isComplete(this.level.id)) return false;
    this.store.complete(this.level.id, this.level.cards);
    return true;
  }

  run(input) {
    if (input.trim()) this.store.remember(input);
    const result = this.shell.run(input);
    const feedback = [];
    const report = message => feedback.push(message);
    let completed = false;
    for (const event of result.stages) {
      if (event.code === 0 && !event.help && this.level.observe?.({ shell: this.shell, state: this.state, event, result, report })) {
        completed = this.complete() || completed;
      }
    }
    return { ...result, feedback, completed };
  }

  get proposal() {
    return this.level.proposals?.[this.proposalIndex];
  }

  decide(verdict) {
    if (!this.proposal || !["approve", "reject"].includes(verdict)) return null;
    const { verdict: expected, explanation } = this.proposal;
    if (verdict !== expected) return { accepted: false, explanation, completed: false };
    this.proposalIndex++;
    return { accepted: true, explanation, completed: !this.proposal && this.complete() };
  }

  reset() {
    this.store.reset();
    this.select(this.levels[0].id);
  }
}
