import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { tools } from "./tools.js";

/**
 * Tool versions - immutable snapshots of tool definitions
 */
export const toolVersions = pgTable(
  "tool_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toolId: uuid("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
    
    // Version info
    version: text("version").notNull(), // semver
    
    // Definition
    inputSchema: jsonb("input_schema").$type<Record<string, unknown>>().notNull().default({}),
    outputSchema: jsonb("output_schema").$type<Record<string, unknown>>().notNull().default({}),
    configSchema: jsonb("config_schema").$type<Record<string, unknown>>(),
    
    // Execution
    executionTarget: jsonb("execution_target").$type<{
      type: "local" | "remote" | "adapter";
      endpoint?: string;
      adapterType?: string;
      timeout?: number;
    }>().notNull(),
    
    // Auth requirements
    authRequirements: jsonb("auth_requirements").$type<Array<{
      type: string;
      secretName: string;
      scope?: string[];
      required: boolean;
    }>>().default([]),
    environmentVariables: jsonb("environment_variables").$type<string[]>().default([]),
    
    // Trust metadata
    trust: jsonb("trust").$type<{
      capabilities: string[];
      riskLevel: "low" | "medium" | "high" | "critical";
      requiresApproval: boolean;
      auditLevel: "none" | "basic" | "full";
    }>().notNull(),
    
    // Hash for verification
    hash: text("hash").notNull(),
    
    // Metadata
    changelog: text("changelog"),
    publishedBy: text("published_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    toolVersionIdx: index("tool_versions_tool_version_idx").on(table.toolId, table.version),
    toolPublishedIdx: index("tool_versions_tool_published_idx").on(table.toolId, table.publishedAt),
  }),
);
