import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectTeamMembers, agents, companyMemberships, authUsers } from "@paperclipai/db";

type ProjectTeamMemberRow = typeof projectTeamMembers.$inferSelect;
type AgentRow = typeof agents.$inferSelect;

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  projectRole: string;
  type: "human" | "agent";
  // Human fields
  principalId?: string | null;
  principalName?: string | null;
  principalEmail?: string | null;
  // Agent fields
  agentId?: string | null;
  agentName?: string | null;
  agentRole?: string | null;
  agentIcon?: string | null;
  // Metadata
  addedBy: string | null;
  createdAt: Date;
}

export interface AddHumanToTeamInput {
  principalType: string;
  principalId: string;
  projectRole?: string;
  addedBy?: string | null;
}

export interface AddAgentToTeamInput {
  agentId: string;
  projectRole?: string;
  addedBy?: string | null;
}

export function projectTeamService(db: Db) {
  /**
   * List all team members for a project (humans + agents)
   */
  async function listForProject(projectId: string): Promise<ProjectTeamMember[]> {
    const rows = await db
      .select()
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));

    const result: ProjectTeamMember[] = [];

    for (const row of rows) {
      if (row.agentId) {
        // Agent member
        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, row.agentId))
          .then((r) => r[0]);

        result.push({
          id: row.id,
          projectId: row.projectId,
          projectRole: row.projectRole,
          type: "agent",
          agentId: row.agentId,
          agentName: agent?.name ?? null,
          agentRole: agent?.role ?? null,
          agentIcon: agent?.icon ?? null,
          addedBy: row.addedBy,
          createdAt: row.createdAt,
        });
      } else if (row.principalId) {
        // Human member - try to get user info
        const user = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, row.principalId))
          .then((r) => r[0]);

        result.push({
          id: row.id,
          projectId: row.projectId,
          projectRole: row.projectRole,
          type: "human",
          principalId: row.principalId,
          principalName: user?.name ?? null,
          principalEmail: user?.email ?? null,
          addedBy: row.addedBy,
          createdAt: row.createdAt,
        });
      }
    }

    return result;
  }

  /**
   * Add a human member to a project team
   */
  async function addHuman(
    projectId: string,
    input: AddHumanToTeamInput
  ): Promise<ProjectTeamMemberRow> {
    const [row] = await db
      .insert(projectTeamMembers)
      .values({
        projectId,
        principalType: input.principalType,
        principalId: input.principalId,
        projectRole: input.projectRole ?? "contributor",
        addedBy: input.addedBy,
      })
      .returning();
    return row;
  }

  /**
   * Add an agent to a project team
   */
  async function addAgent(
    projectId: string,
    input: AddAgentToTeamInput
  ): Promise<ProjectTeamMemberRow> {
    const [row] = await db
      .insert(projectTeamMembers)
      .values({
        projectId,
        agentId: input.agentId,
        projectRole: input.projectRole ?? "contributor",
        addedBy: input.addedBy,
      })
      .returning();
    return row;
  }

  /**
   * Remove a team member by ID
   */
  async function remove(id: string): Promise<boolean> {
    const result = await db
      .delete(projectTeamMembers)
      .where(eq(projectTeamMembers.id, id))
      .returning();
    return result.length > 0;
  }

  /**
   * Remove agent from project by agentId
   */
  async function removeAgent(projectId: string, agentId: string): Promise<boolean> {
    const result = await db
      .delete(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.agentId, agentId)
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Remove human from project
   */
  async function removeHuman(
    projectId: string,
    principalType: string,
    principalId: string
  ): Promise<boolean> {
    const result = await db
      .delete(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.principalType, principalType),
          eq(projectTeamMembers.principalId, principalId)
        )
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Update a team member's role
   */
  async function updateRole(id: string, projectRole: string): Promise<ProjectTeamMemberRow | null> {
    const [row] = await db
      .update(projectTeamMembers)
      .set({ projectRole, updatedAt: new Date() })
      .where(eq(projectTeamMembers.id, id))
      .returning();
    return row ?? null;
  }

  /**
   * Check if an agent is on a project team
   */
  async function isAgentOnTeam(projectId: string, agentId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: projectTeamMembers.id })
      .from(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.agentId, agentId)
        )
      );
    return !!row;
  }

  /**
   * Get projects an agent is assigned to
   */
  async function getProjectsForAgent(agentId: string): Promise<string[]> {
    const rows = await db
      .select({ projectId: projectTeamMembers.projectId })
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.agentId, agentId));
    return rows.map((r) => r.projectId);
  }

  return {
    listForProject,
    addHuman,
    addAgent,
    remove,
    removeAgent,
    removeHuman,
    updateRole,
    isAgentOnTeam,
    getProjectsForAgent,
  };
}
