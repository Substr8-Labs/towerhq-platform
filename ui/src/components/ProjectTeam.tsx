import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectTeamApi, type ProjectTeamMember, type AddAgentInput } from "../api/projectTeam";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, User, Plus, X, Crown, Loader2 } from "lucide-react";

interface ProjectTeamProps {
  projectId: string;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    lead: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    contributor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    viewer: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return (
    <Badge variant="outline" className={colors[role] ?? colors.contributor}>
      {role === "lead" && <Crown className="w-3 h-3 mr-1" />}
      {role}
    </Badge>
  );
}

function TeamMemberRow({
  member,
  onRemove,
  isRemoving,
}: {
  member: ProjectTeamMember;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const isHuman = member.type === "human";
  const name = isHuman ? member.principalName : member.agentName;
  const subtitle = isHuman ? member.principalEmail : member.agentRole;
  const Icon = isHuman ? User : Bot;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium text-sm">{name ?? "Unknown"}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RoleBadge role={member.projectRole} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function AddAgentDialog({
  projectId,
  existingAgentIds,
  onSuccess,
}: {
  projectId: string;
  existingAgentIds: Set<string>;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"lead" | "contributor" | "viewer">("contributor");
  const { selectedCompany } = useCompany();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompany?.id ?? ""),
    queryFn: () => agentsApi.list(selectedCompany?.id ?? ""),
    enabled: !!selectedCompany?.id && open,
  });

  const availableAgents = agents.filter((a) => !existingAgentIds.has(a.id));

  const addMutation = useMutation({
    mutationFn: (input: AddAgentInput) => projectTeamApi.addAgent(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectTeam", projectId] });
      pushToast({ title: "Agent added to team", tone: "success" });
      setOpen(false);
      setSelectedAgent("");
      onSuccess();
    },
    onError: (err: Error) => {
      pushToast({ title: err.message || "Failed to add agent", tone: "error" });
    },
  });

  const handleAdd = () => {
    if (!selectedAgent) return;
    addMutation.mutate({ agentId: selectedAgent, projectRole: selectedRole });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agent to Team</DialogTitle>
          <DialogDescription>
            Select an agent to add to this project team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No available agents
                  </div>
                ) : (
                  availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        {agent.name}
                        {agent.role && (
                          <span className="text-muted-foreground">
                            ({agent.role})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as typeof selectedRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedAgent || addMutation.isPending}
          >
            {addMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Add to Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTeam({ projectId }: ProjectTeamProps) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["projectTeam", projectId],
    queryFn: () => projectTeamApi.list(projectId),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => projectTeamApi.remove(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectTeam", projectId] });
      pushToast({ title: "Team member removed", tone: "success" });
    },
    onError: (err: Error) => {
      pushToast({ title: err.message || "Failed to remove member", tone: "error" });
    },
    onSettled: () => {
      setRemovingId(null);
    },
  });

  const handleRemove = (memberId: string) => {
    setRemovingId(memberId);
    removeMutation.mutate(memberId);
  };

  const humans = team.filter((m: ProjectTeamMember) => m.type === "human");
  const agents = team.filter((m: ProjectTeamMember) => m.type === "agent");
  const existingAgentIds = new Set(
    agents.map((a: ProjectTeamMember) => a.agentId).filter(Boolean) as string[]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Humans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Team Members
          </h3>
        </div>
        {humans.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No human members yet
          </div>
        ) : (
          <div className="space-y-2">
            {humans.map((member: ProjectTeamMember) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                onRemove={() => handleRemove(member.id)}
                isRemoving={removingId === member.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Agents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Teammates
          </h3>
          <AddAgentDialog
            projectId={projectId}
            existingAgentIds={existingAgentIds}
            onSuccess={() => {}}
          />
        </div>
        {agents.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No AI teammates yet
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((member: ProjectTeamMember) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                onRemove={() => handleRemove(member.id)}
                isRemoving={removingId === member.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
