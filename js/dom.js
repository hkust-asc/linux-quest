export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function viewHeading(title, description) {
  return [element("h3", title), element("p", description, "view-description")];
}

export function drawChips(container, chips) {
  container.replaceChildren(...chips.map(({ label, type, origin }) => {
    const chip = element("span", label, `chip ${type}`);
    if (origin) chip.title = origin;
    return chip;
  }));
}
