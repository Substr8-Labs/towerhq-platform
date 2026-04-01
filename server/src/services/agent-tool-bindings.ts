import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentToolBindings, tools } from "@paperclipai/db";

type AgentToolBindingRow = typeof agentToolBindings.$inferSelect;

export interface AgentToolBinding {
  id: string;
  agentId: string;
  toolId: string;
  toolName: string;
  toolSlug: string;
  toolType: string;
  version: string;
  versionPolicy: string;
  config: Record<string, unknown> | null;
  attachedBy: string | null;
  attachedAt: Date;
}

export interface AttachToolInput {
  toolId: string;
  version: string;
  versionPolicy?: string;
  config?: Record<string, unknown> | null;
  attachedBy?: string | null;
}

export function agentToolBindingService(db: Db) {
  /**
   * List all tools attached to an agent
   */
  async function listForAgent(agentId: string): Promise<AgentToolBinding[]> {
    const rows = await db
      .select({
        binding: agentToolBindings,
        tool: tools,
      })
      .from(agentToolBindings)
      .innerJoin(tools, eq(agentToolBindings.toolId, tools.id))
      .where(eq(agentToolBindings.agentId, agentId));

    return rows.map((r) => ({
      id: r.binding.id,
      agentId: r.binding.agentId,
      toolId: r.binding.toolId,
      toolName: r.tool.name,
      toolSlug: r.tool.slug,
      toolType: r.tool.type,
      version: r.binding.version,
      versionPolicy: r.binding.versionPolicy,
      config: r.binding.config as Record<string, unknown> | null,
      attachedBy: r.binding.attachedBy,
      attachedAt: r.binding.attachedAt,
    }));
  }

  /**
   * Attach a tool to an agent
   */
  async function attach(
    agentId: string,
    input: AttachToolInput
  ): Promise<AgentToolBindingRow> {
    const [row] = await db
      .insert(agentToolBindings)
      .values({
        agentId,
        toolId: input.toolId,
        version: input.version,
        versionPolicy: input.versionPolicy ?? "auto-minor",
        config: input.config,
        attachedBy: input.attachedBy,
      })
      .returning();
    return row;
  }

  /**
   * Detach a tool from an agent
   */
  async function detach(agentId: string, toolId: string): Promise<boolean> {
    const result = await db
      .delete(agentToolBindings)
      .where(
        and(
          eq(agentToolBindings.agentId, agentId),
          eq(agentToolBindings.toolId, toolId)
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Update config for a binding
   */
  async function updateConfig(
    agentId: string,
    toolId: string,
    config: Record<string, unknown>
  ): Promise<AgentToolBindingRow | null> {
    const [row] = await db
      .update(agentToolBindings)
      .set({ config, updatedAt: new Date() })
      .where(
        and(
          eq(agentToolBindings.agentId, agentId),
          eq(agentToolBindings.toolId, toolId)
        )
      )
      .returning();
    return row ?? null;
  }

  return {
    listForAgent,
    attach,
    detach,
    updateConfig,
  };
}
