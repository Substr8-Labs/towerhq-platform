import { api } from "./client";

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  projectRole: "lead" | "contributor" | "viewer";
  type: "human" | "agent";
  principalId?: string | null;
  principalName?: string | null;
  principalEmail?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  agentRole?: string | null;
  agentIcon?: string | null;
  addedBy: string | null;
  createdAt: string;
}

export interface AddHumanInput {
  principalType?: string;
  principalId: string;
  projectRole?: "lead" | "contributor" | "viewer";
}

export interface AddAgentInput {
  agentId: string;
  projectRole?: "lead" | "contributor" | "viewer";
}

export const projectTeamApi = {
  list: (projectId: string) =>
    api.get<ProjectTeamMember[]>("/projects/" + projectId + "/team"),

  addHuman: (projectId: string, input: AddHumanInput) =>
    api.post<ProjectTeamMember>("/projects/" + projectId + "/team/humans", input),

  addAgent: (projectId: string, input: AddAgentInput) =>
    api.post<ProjectTeamMember>("/projects/" + projectId + "/team/agents", input),

  updateRole: (
    projectId: string,
    memberId: string,
    projectRole: "lead" | "contributor" | "viewer"
  ) =>
    api.patch<ProjectTeamMember>("/projects/" + projectId + "/team/" + memberId, { projectRole }),

  remove: (projectId: string, memberId: string) =>
    api.delete<void>("/projects/" + projectId + "/team/" + memberId),
};
