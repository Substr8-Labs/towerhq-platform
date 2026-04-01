export const type = "substr8";

export function formatStdoutEvent(line: string, debug: boolean): void {
  // Pass through Substr8 log lines
  if (line.startsWith("[substr8]")) {
    console.log(line);
  }
}
