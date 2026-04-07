import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const kimiOrchestratorAdapter: ServerAdapterModule = {
  type: "kimi_orchestrator",
  execute,
  testEnvironment,
  models: [{ id: "kimi-k2.5", label: "Kimi k2.5 (Orchestrator)" }],
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: `# Kimi Orchestrator

Adapter: kimi_orchestrator

Runs tasks via Ada's agent-team orchestration. Kimi k2.5 orchestrates, Claude CLI workers execute.

Fields:
- adaServiceUrl (string): ada-orchestration service URL (default: http://localhost:8101)
- team (string): team config name (default: "default")
- workers (string): comma-separated worker filter (optional)
- workDir (string): working directory for workers
- timeoutSec (number): overall timeout (default: 600)
`,
};
