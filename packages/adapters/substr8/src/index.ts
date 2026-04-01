/**
 * Substr8 Adapter for TowerHQ
 * 
 * Wraps any base adapter to add:
 * - Pre-execution: Register with RunProof, snapshot state, capture input_hash
 * - Post-execution: Write to GAM, record delta versions, create proof
 * 
 * The adapter wraps execution, it doesn't replace it.
 */

export const type = "substr8";
export const label = "Substr8 Governed";

export const models: { id: string; label: string }[] = [];

export const agentConfigurationDoc = `# substr8 agent configuration

Adapter: substr8

The Substr8 adapter wraps any other adapter (OpenClaw, Claude Code, Codex, etc.)
to add governed memory and proof generation.

Core fields:
- baseAdapter (string, required): The underlying adapter type to wrap (e.g. "openclaw_gateway", "claude_local")
- baseAdapterConfig (object, required): Configuration for the base adapter

Substr8 fields:
- gamUrl (string, optional): GAM service URL (default: process.env.GAM_URL or http://localhost:8091)
- runproofUrl (string, optional): RunProof service URL (default: process.env.RUNPROOF_URL)
- agentId (string, optional): Agent ID for memory scoping (default: agent name)
- tenantId (string, optional): Tenant ID for memory scoping (default: "default")

Governance fields:
- governanceMode (string, optional): "observe" | "enforce" | "audit" (default: "observe")
- captureMemory (boolean, optional): Write execution context to GAM (default: true)
- createProof (boolean, optional): Generate RunProof proof (default: true)

Result metadata:
- resultJson.substr8.proof_url: URL to the generated proof
- resultJson.substr8.memory_summary: { written: number, recalled: number }
- resultJson.substr8.governance_summary: { mode: string, violations: number }
`;
