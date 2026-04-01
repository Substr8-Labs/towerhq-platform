import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companySkills } from "./company_skills.js";

/**
 * Agent skill bindings - attaches skills to agents with version policy
 */
export const agentSkillBindings = pgTable(
  "agent_skill_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => companySkills.id, { onDelete: "cascade" }),
    
    // Version binding
    version: text("version").notNull(),      // Current version: "2.1.0"
    versionPolicy: text("version_policy").notNull().default("auto-minor"), 
    // pin-exact, auto-patch, auto-minor, always-latest
    
    // Metadata
    attachedBy: text("attached_by"),
    attachedAt: timestamp("attached_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentSkillUniqueIdx: uniqueIndex("agent_skill_bindings_unique_idx")
      .on(table.agentId, table.skillId),
    agentIdx: index("agent_skill_bindings_agent_idx").on(table.agentId),
    skillIdx: index("agent_skill_bindings_skill_idx").on(table.skillId),
  }),
);
