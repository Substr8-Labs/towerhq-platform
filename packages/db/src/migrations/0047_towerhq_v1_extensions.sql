-- TowerHQ v1 Schema Extensions
-- Adds: project team members, skill versions, tools, bindings

-- Project team members (humans + agents on a project)
CREATE TABLE IF NOT EXISTS "project_team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "principal_type" text,
  "principal_id" text,
  "agent_id" uuid REFERENCES "agents"("id") ON DELETE CASCADE,
  "project_role" text NOT NULL DEFAULT 'contributor',
  "added_by" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_team_members_project_user_unique_idx" 
  ON "project_team_members" ("project_id", "principal_type", "principal_id");
CREATE UNIQUE INDEX IF NOT EXISTS "project_team_members_project_agent_unique_idx" 
  ON "project_team_members" ("project_id", "agent_id");
CREATE INDEX IF NOT EXISTS "project_team_members_project_idx" 
  ON "project_team_members" ("project_id");
CREATE INDEX IF NOT EXISTS "project_team_members_agent_idx" 
  ON "project_team_members" ("agent_id");

-- Skill versions (immutable snapshots)
CREATE TABLE IF NOT EXISTS "skill_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "skill_id" uuid NOT NULL REFERENCES "company_skills"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "content" text NOT NULL,
  "references" jsonb DEFAULT '[]',
  "files" jsonb DEFAULT '[]',
  "hash" text NOT NULL,
  "changelog" text,
  "published_by" text,
  "published_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "skill_versions_skill_version_idx" 
  ON "skill_versions" ("skill_id", "version");
CREATE INDEX IF NOT EXISTS "skill_versions_skill_published_idx" 
  ON "skill_versions" ("skill_id", "published_at");

-- Agent skill bindings
CREATE TABLE IF NOT EXISTS "agent_skill_bindings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "skill_id" uuid NOT NULL REFERENCES "company_skills"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "version_policy" text NOT NULL DEFAULT 'auto-minor',
  "attached_by" text,
  "attached_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_skill_bindings_unique_idx" 
  ON "agent_skill_bindings" ("agent_id", "skill_id");
CREATE INDEX IF NOT EXISTS "agent_skill_bindings_agent_idx" 
  ON "agent_skill_bindings" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_skill_bindings_skill_idx" 
  ON "agent_skill_bindings" ("skill_id");

-- Tools registry
CREATE TABLE IF NOT EXISTS "tools" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "type" text NOT NULL DEFAULT 'api',
  "status" text NOT NULL DEFAULT 'draft',
  "scope" text NOT NULL DEFAULT 'org-wide',
  "current_version_id" uuid,
  "hash" text,
  "created_by" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tools_company_slug_unique_idx" 
  ON "tools" ("company_id", "slug");
CREATE INDEX IF NOT EXISTS "tools_company_status_idx" 
  ON "tools" ("company_id", "status");
CREATE INDEX IF NOT EXISTS "tools_company_type_idx" 
  ON "tools" ("company_id", "type");

-- Tool versions
CREATE TABLE IF NOT EXISTS "tool_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tool_id" uuid NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "input_schema" jsonb NOT NULL DEFAULT '{}',
  "output_schema" jsonb NOT NULL DEFAULT '{}',
  "config_schema" jsonb,
  "execution_target" jsonb NOT NULL,
  "auth_requirements" jsonb DEFAULT '[]',
  "environment_variables" jsonb DEFAULT '[]',
  "trust" jsonb NOT NULL,
  "hash" text NOT NULL,
  "changelog" text,
  "published_by" text,
  "published_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tool_versions_tool_version_idx" 
  ON "tool_versions" ("tool_id", "version");
CREATE INDEX IF NOT EXISTS "tool_versions_tool_published_idx" 
  ON "tool_versions" ("tool_id", "published_at");

-- Agent tool bindings
CREATE TABLE IF NOT EXISTS "agent_tool_bindings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "tool_id" uuid NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "version_policy" text NOT NULL DEFAULT 'auto-minor',
  "config" jsonb,
  "attached_by" text,
  "attached_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_tool_bindings_unique_idx" 
  ON "agent_tool_bindings" ("agent_id", "tool_id");
CREATE INDEX IF NOT EXISTS "agent_tool_bindings_agent_idx" 
  ON "agent_tool_bindings" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_tool_bindings_tool_idx" 
  ON "agent_tool_bindings" ("tool_id");

-- Project skill requirements
CREATE TABLE IF NOT EXISTS "project_skill_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "skill_id" uuid NOT NULL REFERENCES "company_skills"("id") ON DELETE CASCADE,
  "requirement" text NOT NULL DEFAULT 'recommended',
  "version_constraint" text,
  "added_by" text,
  "added_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_skill_requirements_unique_idx" 
  ON "project_skill_requirements" ("project_id", "skill_id");
CREATE INDEX IF NOT EXISTS "project_skill_requirements_project_idx" 
  ON "project_skill_requirements" ("project_id");

-- Project tool availability
CREATE TABLE IF NOT EXISTS "project_tool_availability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "tool_id" uuid NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE,
  "available" boolean NOT NULL DEFAULT true,
  "config" jsonb,
  "requires_approval" boolean NOT NULL DEFAULT false,
  "added_by" text,
  "added_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_tool_availability_unique_idx" 
  ON "project_tool_availability" ("project_id", "tool_id");
CREATE INDEX IF NOT EXISTS "project_tool_availability_project_idx" 
  ON "project_tool_availability" ("project_id");

-- Add status and current_version_id to company_skills
ALTER TABLE "company_skills" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'draft';
ALTER TABLE "company_skills" ADD COLUMN IF NOT EXISTS "current_version_id" uuid;
