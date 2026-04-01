import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { companySkills } from "./company_skills.js";

/**
 * Project skill requirements - skills required/recommended for a project
 */
export const projectSkillRequirements = pgTable(
  "project_skill_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => companySkills.id, { onDelete: "cascade" }),
    
    // Requirement level
    requirement: text("requirement").notNull().default("recommended"),
    // required, recommended, deprecated
    
    // Version constraint (semver range)
    versionConstraint: text("version_constraint"), // ">=2.0.0", "^1.0.0"
    
    // Metadata
    addedBy: text("added_by"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectSkillUniqueIdx: uniqueIndex("project_skill_requirements_unique_idx")
      .on(table.projectId, table.skillId),
    projectIdx: index("project_skill_requirements_project_idx").on(table.projectId),
  }),
);
