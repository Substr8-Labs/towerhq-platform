import { pgTable, uuid, text, timestamp, jsonb, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { tools } from "./tools.js";

/**
 * Project tool availability - which tools are available in a project
 */
export const projectToolAvailability = pgTable(
  "project_tool_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
    
    // Availability
    available: boolean("available").notNull().default(true),
    
    // Config override for this project
    config: jsonb("config").$type<Record<string, unknown>>(),
    
    // Approval requirement override
    requiresApproval: boolean("requires_approval").notNull().default(false),
    
    // Metadata
    addedBy: text("added_by"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectToolUniqueIdx: uniqueIndex("project_tool_availability_unique_idx")
      .on(table.projectId, table.toolId),
    projectIdx: index("project_tool_availability_project_idx").on(table.projectId),
  }),
);
