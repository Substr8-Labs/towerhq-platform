import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentSkillBindings, companySkills, skillVersions } from "@paperclipai/db";

type AgentSkillBindingRow = typeof agentSkillBindings.$inferSelect;

export interface AgentSkillBinding {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  version: string;
  versionPolicy: string;
  attachedBy: string | null;
  attachedAt: Date;
}

export interface AttachSkillInput {
  skillId: string;
  version: string;
  versionPolicy?: string;
  attachedBy?: string | null;
}

export function agentSkillBindingService(db: Db) {
  /**
   * List all skills attached to an agent
   */
  async function listForAgent(agentId: string): Promise<AgentSkillBinding[]> {
    const rows = await db
      .select({
        binding: agentSkillBindings,
        skill: companySkills,
      })
      .from(agentSkillBindings)
      .innerJoin(companySkills, eq(agentSkillBindings.skillId, companySkills.id))
      .where(eq(agentSkillBindings.agentId, agentId));

    return rows.map((r) => ({
      id: r.binding.id,
      agentId: r.binding.agentId,
      skillId: r.binding.skillId,
      skillName: r.skill.name,
      skillSlug: r.skill.slug,
      version: r.binding.version,
      versionPolicy: r.binding.versionPolicy,
      attachedBy: r.binding.attachedBy,
      attachedAt: r.binding.attachedAt,
    }));
  }

  /**
   * Attach a skill to an agent
   */
  async function attach(
    agentId: string,
    input: AttachSkillInput
  ): Promise<AgentSkillBindingRow> {
    const [row] = await db
      .insert(agentSkillBindings)
      .values({
        agentId,
        skillId: input.skillId,
        version: input.version,
        versionPolicy: input.versionPolicy ?? "auto-minor",
        attachedBy: input.attachedBy,
      })
      .returning();
    return row;
  }

  /**
   * Detach a skill from an agent
   */
  async function detach(agentId: string, skillId: string): Promise<boolean> {
    const result = await db
      .delete(agentSkillBindings)
      .where(
        and(
          eq(agentSkillBindings.agentId, agentId),
          eq(agentSkillBindings.skillId, skillId)
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Update version policy for a binding
   */
  async function updatePolicy(
    agentId: string,
    skillId: string,
    versionPolicy: string
  ): Promise<AgentSkillBindingRow | null> {
    const [row] = await db
      .update(agentSkillBindings)
      .set({ versionPolicy, updatedAt: new Date() })
      .where(
        and(
          eq(agentSkillBindings.agentId, agentId),
          eq(agentSkillBindings.skillId, skillId)
        )
      )
      .returning();
    return row ?? null;
  }

  /**
   * Update pinned version
   */
  async function updateVersion(
    agentId: string,
    skillId: string,
    version: string
  ): Promise<AgentSkillBindingRow | null> {
    const [row] = await db
      .update(agentSkillBindings)
      .set({ version, updatedAt: new Date() })
      .where(
        and(
          eq(agentSkillBindings.agentId, agentId),
          eq(agentSkillBindings.skillId, skillId)
        )
      )
      .returning();
    return row ?? null;
  }

  return {
    listForAgent,
    attach,
    detach,
    updatePolicy,
    updateVersion,
  };
}
