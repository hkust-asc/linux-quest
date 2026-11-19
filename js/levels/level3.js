import { WORKSPACE } from "../vfs.js";

const sensor = `${WORKSPACE}/sensor_dump`;
const frequency = "TARGET_FREQ: 4.2GHz\n";
const telemetry = `SENSOR: ONLINE\n${frequency}SAMPLES: 16\n`;
const warnings = "WARN: auxiliary probe did not respond\nERROR: backup sensor timed out\n";
const clean = `${WORKSPACE}/clean.txt`;
const errors = `${WORKSPACE}/err.log`;

export default {
  id: 3, title: "Plumbing the Noise", visualizer: "streams",
  objective: "Run the workspace sensor, separating telemetry into clean.txt and warnings into err.log. Then isolate the TARGET_FREQ line with a text filter or pipeline.",
  hints: [
    "Standard output and standard error are different channels. Try tldr grep for the filtering step.",
    "Route normal output with > and error output with 2>. Then use grep on the clean stream or on saved telemetry.",
    "Run ./sensor_dump > clean.txt 2> err.log, then grep TARGET_FREQ clean.txt.",
  ],
  cards: ["streams", "pipe", "grep"],
  setup(shell) {
    shell.vfs.write(sensor, "# Simulated sensor program\n", {
      mode: 0o755, program: () => ({ stdout: telemetry, stderr: warnings }),
    });
  },
  observe({ shell, state, event, result }) {
    if (event.executed === sensor && event.writes.some(write => write.path === clean && write.stream === "stdout")
      && event.writes.some(write => write.path === errors && write.stream === "stderr")) state.routed = true;
    const fromTelemetry = event.stdin.includes(telemetry) || event.reads.some(path => shell.vfs.get(path)?.text.includes(telemetry));
    if (fromTelemetry && (event.name === "grep" || result.stages.length > 1) && event.stdout === frequency &&
      ((event === result.stages.at(-1) && result.stdout === frequency)
      || event.writes.some(write => write.stream === "stdout" && shell.vfs.get(write.path)?.text.includes(frequency)))) {
      state.extracted = true;
    }
    return state.routed && state.extracted && shell.vfs.get(clean)?.text === telemetry && shell.vfs.get(errors)?.text === warnings;
  },
};
