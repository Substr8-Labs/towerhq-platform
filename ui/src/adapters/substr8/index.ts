import type { UIAdapterModule, TranscriptEntry, CreateConfigValues } from "../types";
import { Substr8ConfigFields } from "./config-fields";

function parseSubstr8StdoutLine(line: string, ts: string): TranscriptEntry[] {
  // Parse Substr8-specific log lines
  if (line.startsWith("[substr8]")) {
    const content = line.slice(9).trim();
    
    // Return as system message for structured logs
    return [{
      ts,
      kind: "system" as const,
      text: `[Substr8] ${content}`,
    }];
  }
  
  // Pass through non-substr8 lines as stdout
  return [{
    ts,
    kind: "stdout" as const,
    text: line,
  }];
}

function buildSubstr8AdapterConfig(values: CreateConfigValues): Record<string, unknown> {
  // Access extra fields via casting since CreateConfigValues doesn't include our custom fields
  const v = values as CreateConfigValues & Record<string, unknown>;
  
  const config: Record<string, unknown> = {
    baseAdapter: v.baseAdapter ?? "openclaw_gateway",
    baseAdapterConfig: v.baseAdapterConfig ?? {},
  };
  
  if (v.gamUrl) config.gamUrl = v.gamUrl;
  if (v.runproofUrl) config.runproofUrl = v.runproofUrl;
  if (v.governanceMode) config.governanceMode = v.governanceMode;
  if (v.captureMemory !== undefined) config.captureMemory = v.captureMemory;
  if (v.createProof !== undefined) config.createProof = v.createProof;
  if (v.agentId) config.agentId = v.agentId;
  if (v.tenantId) config.tenantId = v.tenantId;
  
  return config;
}

export const substr8UIAdapter: UIAdapterModule = {
  type: "substr8",
  label: "Substr8 Governed",
  parseStdoutLine: parseSubstr8StdoutLine,
  ConfigFields: Substr8ConfigFields,
  buildAdapterConfig: buildSubstr8AdapterConfig,
};
