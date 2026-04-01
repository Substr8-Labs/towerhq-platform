import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * Tools - executable capabilities for agents
 * Separate from skills (methodology) - tools are actions
 */
export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    
    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    
    // Classification
    type: text("type").notNull().default("api"), 
    // api, script, connector, webhook, database, file, mcp, custom
    
    status: text("status").notNull().default("draft"),
    // draft, testing, active, deprecated, archived
    
    scope: text("scope").notNull().default("org-wide"),
    // org-wide, project-scoped, imported, system
    
    // Current version reference
    currentVersionId: uuid("current_version_id"),
    
    // Content hash of current version
    hash: text("hash"),
    
    // Metadata
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySlugUniqueIdx: uniqueIndex("tools_company_slug_unique_idx")
      .on(table.companyId, table.slug),
    companyStatusIdx: index("tools_company_status_idx")
      .on(table.companyId, table.status),
    companyTypeIdx: index("tools_company_type_idx")
      .on(table.companyId, table.type),
  }),
);
