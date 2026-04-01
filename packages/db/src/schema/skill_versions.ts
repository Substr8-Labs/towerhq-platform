import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companySkills } from "./company_skills.js";

/**
 * Skill versions - immutable snapshots of skill content
 * Each publish creates a new version with a content hash
 */
export const skillVersions = pgTable(
  "skill_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillId: uuid("skill_id").notNull().references(() => companySkills.id, { onDelete: "cascade" }),
    
    // Version info
    version: text("version").notNull(), // semver: "1.0.0", "2.1.0"
    
    // Content snapshot
    content: text("content").notNull(),  // SKILL.md content
    references: jsonb("references").$type<Array<{ name: string; content: string }>>().default([]),
    files: jsonb("files").$type<Array<{ name: string; path: string }>>().default([]),
    
    // Hash for verification
    hash: text("hash").notNull(), // sha256 of content
    
    // Metadata
    changelog: text("changelog"),
    publishedBy: text("published_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    skillVersionIdx: index("skill_versions_skill_version_idx").on(table.skillId, table.version),
    skillPublishedIdx: index("skill_versions_skill_published_idx").on(table.skillId, table.publishedAt),
  }),
);
