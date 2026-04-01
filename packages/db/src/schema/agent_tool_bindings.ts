import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { tools } from "./tools.js";

/**
 * Agent tool bindings - attaches tools to agents with config
 */
export const agentToolBindings = pgTable(
  "agent_tool_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
    
    // Version binding
    version: text("version").notNull(),
    versionPolicy: text("version_policy").notNull().default("auto-minor"),
    
    // Config override for this agent
    config: jsonb("config").$type<Record<string, unknown>>(),
    
    // Metadata
    attachedBy: text("attached_by"),
    attachedAt: timestamp("attached_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentToolUniqueIdx: uniqueIndex("agent_tool_bindings_unique_idx")
      .on(table.agentId, table.toolId),
    agentIdx: index("agent_tool_bindings_agent_idx").on(table.agentId),
    toolIdx: index("agent_tool_bindings_tool_idx").on(table.toolId),
  }),
);
