# Supercomputer Cadet: Linux X-Ray

Linux X-Ray is an ASC Team browser game for the HKUST ASC student supercomputing team. It is not an official university program or product. Act 1 has six missions: filesystem navigation, file permissions, streams, environment and PATH, process telemetry, and reviewing AI-proposed cluster commands.

The terminal shows how commands work without running anything on your machine or contacting a cluster. Progress, unlocked Codex cards, and terminal history are stored in this browser; **Reset Progress** clears them. Do not enter real credentials in the simulator.

## Run locally

From the repository root, run `python3 -m http.server` and open `http://localhost:8000/index.html` in a browser. Opening `index.html` through `file://` may break ES module loading. There is no build, dependency install, or backend.

## Publish later

After review, a repository maintainer can configure GitHub Pages to serve the root (`/`) of `main`. The root `index.html` is the entry point, and the existing `.nojekyll` allows static files to be served without Jekyll processing.

## Add a level

1. Define a module such as `js/levels/level7.js` with its objective, hints, visualizer, and `setup` and `observe` hooks. Seed a fresh simulated snapshot and check command events or VFS state, not literal input strings.
2. Register it in `js/levels/index.js`, add its referenced cards to `js/codex.js`, and add any new simulated command behavior and help to `js/commands.js` and `js/etymology.js`.
3. Add a shell-to-completion test (including an alternate solution) under `tests/`, run `node --test`, and play the mission from the static server.

## Tests

Run `node --test` from the repository root. Tests use Node's built-in runner and import the same ES modules as the browser.

Run `node --test tests/play.test.js tests/contracts.test.js` for deterministic Act 1 replays and structural contract checks. For bounded TLA+ checks, run `bash formal/check.sh Mission`, `bash formal/check.sh Shell`, `bash formal/check.sh VFS`, or `bash formal/check.sh Audit`. The project-local skills in `.agents/skills/` describe coverage, limits, and negative controls for each check.
