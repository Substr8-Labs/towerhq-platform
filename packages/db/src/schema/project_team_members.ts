import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

/**
 * Project team members - links humans and agents to projects
 * Replaces the implicit assignment model with explicit team membership
 */
export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    
    // Either a user (principal) or an agent - one must be set
    principalType: text("principal_type"), // "user" when human
    principalId: text("principal_id"),     // user ID when human
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    
    // Role on the project
    projectRole: text("project_role").notNull().default("contributor"), // lead, contributor, viewer
    
    // Metadata
    addedBy: text("added_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique per project + member (either user or agent)
    projectUserUniqueIdx: uniqueIndex("project_team_members_project_user_unique_idx")
      .on(table.projectId, table.principalType, table.principalId),
    projectAgentUniqueIdx: uniqueIndex("project_team_members_project_agent_unique_idx")
      .on(table.projectId, table.agentId),
    projectIdx: index("project_team_members_project_idx").on(table.projectId),
    agentIdx: index("project_team_members_agent_idx").on(table.agentId),
  }),
);
