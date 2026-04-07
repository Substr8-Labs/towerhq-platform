import type { TranscriptEntry } from "../types";

const workerHeaderRe = /^--- .+ \[exit: \d+\] ---$/;
const statusPrefixRe = /^\[(run-team|kimi-orchestrator)\]/;
const summaryPrefixRe = /^(TEAM RESULTS:|SUMMARY:|TASK:)/;
const dividerRe = /^={4,}$/;

export function parseKimiOrchestratorStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (dividerRe.test(line)) return [];

  if (workerHeaderRe.test(line) || statusPrefixRe.test(line) || summaryPrefixRe.test(line)) {
    return [{ kind: "system", ts, text: line }];
  }

  return [{ kind: "assistant", ts, text: line + "\n", delta: true }];
}
