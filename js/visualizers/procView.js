import { element, viewHeading } from "../dom.js";

export function procView(shell) {
  const telemetry = element("div", undefined, "metrics");
  for (const [value, label] of [["4", "VIRTUAL CORES"], ["8 GiB", "TOTAL MEMORY"], [shell.processes.length, "PROCESSES"]]) {
    const metric = element("div");
    metric.append(element("strong", value), element("small", label));
    telemetry.append(metric);
  }
  const table = element("table");
  const header = table.createTHead().insertRow();
  for (const label of ["PID", "Command", "CPU", "Memory"]) {
    const cell = element("th", label);
    cell.scope = "col";
    header.append(cell);
  }
  const body = table.createTBody();
  for (const proc of shell.processes) {
    const row = body.insertRow();
    if (proc.cpu >= 90) row.className = "danger";
    for (const value of [proc.pid, proc.name, `${proc.cpu}%`, `${proc.memory} MiB`]) row.insertCell().textContent = value;
  }
  return [...viewHeading("System Telemetry", "Generic login-node hardware and simulated running processes."), telemetry, table];
}
