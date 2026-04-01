import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { projectTeamService } from "../services/project-team.js";
import { projectService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

// Validation schemas
const addHumanSchema = z.object({
  principalType: z.string().default("user"),
  principalId: z.string().min(1),
  projectRole: z.enum(["lead", "contributor", "viewer"]).optional(),
});

const addAgentSchema = z.object({
  agentId: z.string().uuid(),
  projectRole: z.enum(["lead", "contributor", "viewer"]).optional(),
});

const updateRoleSchema = z.object({
  projectRole: z.enum(["lead", "contributor", "viewer"]),
});

export function projectTeamRoutes(db: Db) {
  const router = Router();
  const svc = projectTeamService(db);
  const projects = projectService(db);

  /**
   * List all team members for a project
   * GET /projects/:projectId/team
   */
  router.get("/projects/:projectId/team", async (req, res) => {
    const projectId = req.params.projectId as string;
    
    // Verify project exists and user has access
    const project = await projects.getById(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);

    const team = await svc.listForProject(projectId);
    res.json(team);
  });

  /**
   * Add a human member to project team
   * POST /projects/:projectId/team/humans
   */
  router.post(
    "/projects/:projectId/team/humans",
    validate(addHumanSchema),
    async (req, res) => {
      const projectId = req.params.projectId as string;
      
      const project = await projects.getById(projectId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);

      const actor = getActorInfo(req);
      const body = req.body as z.infer<typeof addHumanSchema>;

      try {
        const member = await svc.addHuman(projectId, {
          principalType: body.principalType,
          principalId: body.principalId,
          projectRole: body.projectRole,
          addedBy: actor.actorId,
        });

        await logActivity(db, {
          companyId: project.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "project_team.human_added",
          entityType: "project",
          entityId: projectId,
          details: {
            memberId: member.id,
            principalId: body.principalId,
            projectRole: body.projectRole ?? "contributor",
          },
        });

        res.status(201).json(member);
      } catch (err: any) {
        if (err.code === "23505") {
          // Unique constraint violation
          res.status(409).json({ error: "Member already on team" });
          return;
        }
        throw err;
      }
    }
  );

  /**
   * Add an agent to project team
   * POST /projects/:projectId/team/agents
   */
  router.post(
    "/projects/:projectId/team/agents",
    validate(addAgentSchema),
    async (req, res) => {
      const projectId = req.params.projectId as string;
      
      const project = await projects.getById(projectId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);

      const actor = getActorInfo(req);
      const body = req.body as z.infer<typeof addAgentSchema>;

      try {
        const member = await svc.addAgent(projectId, {
          agentId: body.agentId,
          projectRole: body.projectRole,
          addedBy: actor.actorId,
        });

        await logActivity(db, {
          companyId: project.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "project_team.agent_added",
          entityType: "project",
          entityId: projectId,
          details: {
            memberId: member.id,
            agentId: body.agentId,
            projectRole: body.projectRole ?? "contributor",
          },
        });

        res.status(201).json(member);
      } catch (err: any) {
        if (err.code === "23505") {
          res.status(409).json({ error: "Agent already on team" });
          return;
        }
        throw err;
      }
    }
  );

  /**
   * Update a team member's role
   * PATCH /projects/:projectId/team/:memberId
   */
  router.patch(
    "/projects/:projectId/team/:memberId",
    validate(updateRoleSchema),
    async (req, res) => {
      const projectId = req.params.projectId as string;
      const memberId = req.params.memberId as string;

      const project = await projects.getById(projectId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);

      const body = req.body as z.infer<typeof updateRoleSchema>;
      const updated = await svc.updateRole(memberId, body.projectRole);
      
      if (!updated) {
        res.status(404).json({ error: "Team member not found" });
        return;
      }

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: project.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "project_team.role_updated",
        entityType: "project",
        entityId: projectId,
        details: {
          memberId,
          newRole: body.projectRole,
        },
      });

      res.json(updated);
    }
  );

  /**
   * Remove a team member
   * DELETE /projects/:projectId/team/:memberId
   */
  router.delete("/projects/:projectId/team/:memberId", async (req, res) => {
    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;

    const project = await projects.getById(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);

    const removed = await svc.remove(memberId);
    if (!removed) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project_team.member_removed",
      entityType: "project",
      entityId: projectId,
      details: { memberId },
    });

    res.status(204).send();
  });

  return router;
}
