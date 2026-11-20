export const storageKey = "linux-xray.act1";
const empty = () => ({ completed: [], cards: [], history: [] });

export function progressStore(storage) {
  let state = empty();
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) ?? "null");
    if (saved) {
      for (const [key, values] of Object.entries(state)) {
        if (Array.isArray(saved[key])) state[key] = [...new Set(saved[key].filter(value => typeof value === (key === "completed" ? "number" : "string")))];
        else state[key] = values;
      }
      if (Array.isArray(saved.history)) state.history = saved.history.filter(value => typeof value === "string").slice(-100);
    }
  } catch {
    state = empty();
  }
  const save = () => {
    try { storage?.setItem(storageKey, JSON.stringify(state)); } catch {}
  };
  return {
    get state() { return state; },
    complete(id, cards) {
      if (!state.completed.includes(id)) state.completed.push(id);
      state.cards = [...new Set([...state.cards, ...cards])];
      save();
    },
    remember(command) {
      state.history.push(command);
      state.history = state.history.slice(-100);
      save();
    },
    reset() {
      state = empty();
      try { storage?.removeItem(storageKey); } catch {}
    },
  };
}
