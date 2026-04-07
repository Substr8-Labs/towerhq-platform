import type { UIAdapterModule } from "../types";
import { parseKimiOrchestratorStdoutLine } from "./parse-stdout";
import { KimiOrchestratorConfigFields } from "./config-fields";
import { buildKimiOrchestratorConfig } from "./build-config";

export const kimiOrchestratorUIAdapter: UIAdapterModule = {
  type: "kimi_orchestrator",
  label: "Kimi Orchestrator",
  parseStdoutLine: parseKimiOrchestratorStdoutLine,
  ConfigFields: KimiOrchestratorConfigFields,
  buildAdapterConfig: buildKimiOrchestratorConfig,
};
