import { api } from "./client";

export interface AgentSkillBinding {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  version: string;
  versionPolicy: "pin-exact" | "auto-patch" | "auto-minor" | "always-latest";
  attachedBy: string | null;
  attachedAt: string;
}

export interface AttachSkillInput {
  skillId: string;
  version: string;
  versionPolicy?: "pin-exact" | "auto-patch" | "auto-minor" | "always-latest";
}

export interface AgentToolBinding {
  id: string;
  agentId: string;
  toolId: string;
  toolName: string;
  toolSlug: string;
  toolType: string;
  version: string;
  versionPolicy: "pin-exact" | "auto-patch" | "auto-minor" | "always-latest";
  config: Record<string, unknown> | null;
  attachedBy: string | null;
  attachedAt: string;
}

export interface AttachToolInput {
  toolId: string;
  version: string;
  versionPolicy?: "pin-exact" | "auto-patch" | "auto-minor" | "always-latest";
  config?: Record<string, unknown>;
}

export const agentSkillsApi = {
  list: (agentId: string) =>
    api.get<AgentSkillBinding[]>("/agents/" + agentId + "/skills"),

  attach: (agentId: string, input: AttachSkillInput) =>
    api.post<AgentSkillBinding>("/agents/" + agentId + "/skills", input),

  updatePolicy: (
    agentId: string,
    skillId: string,
    versionPolicy: "pin-exact" | "auto-patch" | "auto-minor" | "always-latest"
  ) =>
    api.patch<AgentSkillBinding>("/agents/" + agentId + "/skills/" + skillId, { versionPolicy }),

  detach: (agentId: string, skillId: string) =>
    api.delete<void>("/agents/" + agentId + "/skills/" + skillId),
};

export const agentToolsApi = {
  list: (agentId: string) =>
    api.get<AgentToolBinding[]>("/agents/" + agentId + "/tools"),

  attach: (agentId: string, input: AttachToolInput) =>
    api.post<AgentToolBinding>("/agents/" + agentId + "/tools", input),

  updateConfig: (
    agentId: string,
    toolId: string,
    config: Record<string, unknown>
  ) =>
    api.patch<AgentToolBinding>("/agents/" + agentId + "/tools/" + toolId, { config }),

  detach: (agentId: string, toolId: string) =>
    api.delete<void>("/agents/" + agentId + "/tools/" + toolId),
};
