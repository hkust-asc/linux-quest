import { element, viewHeading } from "../dom.js";

function signal() {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 300 18");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("signal");
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", "M0 9 H293 l-6 -5 M293 9 l-6 5");
  svg.append(path);
  return svg;
}

export function streamView(shell, result) {
  const flow = element("div", undefined, "flow");
  if (!result?.stages.length) flow.append(element("p", "Awaiting a command to trace.", "fog"));
  for (const [index, stage] of (result?.stages ?? []).entries()) {
    const block = element("section", undefined, "flow-stage");
    block.append(element("h4", `${String(index + 1).padStart(2, "0")} / ${stage.name}`));
    for (const [stream, fd, fallback] of [["stdin", 0, index ? "← pipe" : "input"],
      ["stdout", 1, index < result.stages.length - 1 ? "→ pipe" : "→ terminal"], ["stderr", 2, "→ terminal"]]) {
      const redirect = stage.writes.find(write => write.stream === stream);
      const lane = element("div", undefined, `lane ${stream}`);
      lane.append(element("strong", `${stream} [${fd}]`),
        element("span", redirect ? `${redirect.operator} ${redirect.path}` : fallback, "route"),
        element("pre", stage[stream].trimEnd() || "—"));
      block.append(lane);
    }
    if (index) flow.append(signal());
    flow.append(block);
  }
  return [...viewHeading("Stream Plumber", "Follow each command’s input, output, errors, and destinations."), flow];
}
