import { element, viewHeading } from "../dom.js";
import { basename } from "../vfs.js";

export function treeView(shell) {
  const tree = element("ul", undefined, "tree");
  function branch(path) {
    const node = shell.vfs.get(path);
    const directory = node.type === "directory";
    const label = element("span", `${directory ? "▸ " : "· "}${basename(path)}${directory && path !== "/" ? "/" : ""}`, directory ? "folder" : "");
    const item = element("li");
    item.append(label);
    if (path === shell.cwd) item.append(element("span", "CWD", "tag"));
    if (directory) {
      const children = shell.vfs.list(path);
      const nested = element("ul");
      const visible = children.filter(child => !basename(child).startsWith(".") || shell.revealed.has(path));
      nested.append(...visible.map(branch));
      if (visible.length !== children.length) nested.append(element("li", "··· hidden entries", "fog"));
      if (nested.childNodes.length) item.append(nested);
    }
    return item;
  }
  tree.append(branch("/"));
  return [...viewHeading("Filesystem Tree", "A live map of the simulated disk. Hidden entries are fogged until revealed."), tree];
}
