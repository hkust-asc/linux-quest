import { element, viewHeading } from "../dom.js";

export function envView(shell) {
  const path = element("ol", undefined, "path-list");
  path.append(...shell.pathDirectories.map(directory => element("li", directory)));
  const variables = element("dl", undefined, "variables");
  for (const [key, value] of Object.entries(shell.env)) variables.append(element("dt", key), element("dd", value));
  return [...viewHeading("$PATH Radar", "The shell searches these directories in order when you run a program by name."),
    path, element("h4", "Exported environment"), variables];
}
