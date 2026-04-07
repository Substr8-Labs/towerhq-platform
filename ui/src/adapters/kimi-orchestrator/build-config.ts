import type { CreateConfigValues } from "../types";

export function buildKimiOrchestratorConfig(values: CreateConfigValues): Record<string, unknown> {
  return {
    adaServiceUrl: values.url || "http://localhost:8101",
    team: "default",
    timeoutSec: 600,
  };
}
