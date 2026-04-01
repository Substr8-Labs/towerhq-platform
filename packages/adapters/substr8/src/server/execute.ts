import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import { createHash } from "node:crypto";

type Substr8Config = {
  baseAdapter: string;
  baseAdapterConfig: Record<string, unknown>;
  gamUrl?: string;
  runproofUrl?: string;
  agentId?: string;
  tenantId?: string;
  governanceMode?: "observe" | "enforce" | "audit";
  captureMemory?: boolean;
  createProof?: boolean;
};

type Substr8ResultMeta = {
  proof_url?: string;
  memory_summary?: {
    written: number;
    recalled: number;
  };
  governance_summary?: {
    mode: string;
    violations: number;
  };
};

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

async function writeToGam(
  gamUrl: string,
  agentId: string,
  tenantId: string,
  content: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; memoryId?: string }> {
  try {
    const response = await fetch(`${gamUrl}/v3/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        tenant: tenantId,
        content,
        metadata,
        source: "substr8-adapter",
      }),
    });
    if (response.ok) {
      const data = await response.json() as { id?: string };
      return { success: true, memoryId: data.id };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

async function createRunProof(
  runproofUrl: string,
  proofData: Record<string, unknown>
): Promise<{ success: boolean; proofUrl?: string }> {
  try {
    const response = await fetch(`${runproofUrl}/proofs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proofData),
    });
    if (response.ok) {
      const data = await response.json() as { id?: string; url?: string };
      const proofUrl = data.url || `${runproofUrl}/proofs/${data.id}`;
      return { success: true, proofUrl };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

export async function execute(
  ctx: AdapterExecutionContext
): Promise<AdapterExecutionResult> {
  const config = ctx.config as Substr8Config;
  
  // Extract Substr8 config
  const gamUrl = config.gamUrl || process.env.GAM_URL || "http://localhost:8091";
  const runproofUrl = config.runproofUrl || process.env.RUNPROOF_URL;
  const agentId = config.agentId || ctx.agent.name;
  const tenantId = config.tenantId || "default";
  const governanceMode = config.governanceMode || "observe";
  const captureMemory = config.captureMemory !== false;
  const createProof = config.createProof !== false && !!runproofUrl;

  // Pre-execution: capture input hash
  const inputHash = hashContent(JSON.stringify({
    runId: ctx.runId,
    agentId: ctx.agent.id,
    context: ctx.context,
  }));
  
  const preExecutionTimestamp = new Date().toISOString();
  
  // Log pre-execution
  await ctx.onLog("stdout", `[substr8] Pre-execution: mode=${governanceMode}, input_hash=${inputHash}\n`);

  // TODO: Execute the base adapter
  // For now, return a placeholder result
  // In full implementation, we would:
  // 1. Dynamically import the base adapter
  // 2. Call its execute() with modified context
  // 3. Capture the result
  
  const baseResult: AdapterExecutionResult = {
    exitCode: 0,
    signal: null,
    timedOut: false,
    summary: "[substr8] Base adapter execution placeholder - wire up base adapter",
  };

  // Post-execution: capture output hash
  const outputHash = hashContent(JSON.stringify({
    exitCode: baseResult.exitCode,
    summary: baseResult.summary,
    resultJson: baseResult.resultJson,
  }));
  
  const postExecutionTimestamp = new Date().toISOString();

  // Substr8 result metadata
  const substr8Meta: Substr8ResultMeta = {
    governance_summary: {
      mode: governanceMode,
      violations: 0,
    },
  };

  // Write to GAM if enabled
  let memoriesWritten = 0;
  if (captureMemory) {
    const memoryContent = `Run ${ctx.runId} completed.
Agent: ${ctx.agent.name}
Input hash: ${inputHash}
Output hash: ${outputHash}
Exit code: ${baseResult.exitCode}
Summary: ${baseResult.summary || "No summary"}`;

    const gamResult = await writeToGam(gamUrl, agentId, tenantId, memoryContent, {
      runId: ctx.runId,
      agentId: ctx.agent.id,
      inputHash,
      outputHash,
      governanceMode,
      preExecutionTimestamp,
      postExecutionTimestamp,
    });
    
    if (gamResult.success) {
      memoriesWritten = 1;
      await ctx.onLog("stdout", `[substr8] Memory written to GAM: ${gamResult.memoryId}\n`);
    }
  }

  substr8Meta.memory_summary = {
    written: memoriesWritten,
    recalled: 0, // TODO: implement recall tracking
  };

  // Create proof if enabled
  if (createProof && runproofUrl) {
    const proofResult = await createRunProof(runproofUrl, {
      runId: ctx.runId,
      agentId: ctx.agent.id,
      agentName: ctx.agent.name,
      inputHash,
      outputHash,
      governanceMode,
      preExecutionTimestamp,
      postExecutionTimestamp,
      exitCode: baseResult.exitCode,
      memoriesWritten,
    });
    
    if (proofResult.success) {
      substr8Meta.proof_url = proofResult.proofUrl;
      await ctx.onLog("stdout", `[substr8] Proof created: ${proofResult.proofUrl}\n`);
    }
  }

  await ctx.onLog("stdout", `[substr8] Post-execution: output_hash=${outputHash}, memories=${memoriesWritten}\n`);

  // Merge Substr8 metadata into result
  return {
    ...baseResult,
    resultJson: {
      ...(baseResult.resultJson || {}),
      substr8: substr8Meta,
    },
  };
}
