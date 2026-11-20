import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const expected = [
  "index.html", ".nojekyll", "README.md", "css/style.css",
  "js/main.js", "js/vfs.js", "js/shell.js", "js/etymology.js", "js/codex.js",
  "js/visualizers/treeView.js", "js/visualizers/streamView.js", "js/visualizers/envView.js",
  "js/visualizers/procView.js", "js/levels/index.js",
  ...Array.from({ length: 6 }, (_, index) => `js/levels/level${index + 1}.js`),
];

test("root index, Pages marker, required modules and no bundler config", () => {
  for (const file of expected) assert.ok(statSync(new URL(file, root)).isFile(), file);
  const entries = readdirSync(fileURLToPath(root), { recursive: true }).filter(name => !name.startsWith(".git/"));
  const bundler = /(?:^|\/)(?:webpack|vite|rollup|parcel|esbuild|rspack|rsbuild|snowpack)\.config(?:\.|$)|(?:^|\/)\.parcelrc(?:\.|$)/i;
  assert.deepEqual(entries.filter(name => bundler.test(name)), []);
});
