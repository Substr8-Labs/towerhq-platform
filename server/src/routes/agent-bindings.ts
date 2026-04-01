import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { agentSkillBindingService } from "../services/agent-skill-bindings.js";
import { agentToolBindingService } from "../services/agent-tool-bindings.js";
import { agentService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

// Validation schemas
const attachSkillSchema = z.object({
  skillId: z.string().uuid(),
  version: z.string().min(1),
  versionPolicy: z.enum(["pin-exact", "auto-patch", "auto-minor", "always-latest"]).optional(),
});

const attachToolSchema = z.object({
  toolId: z.string().uuid(),
  version: z.string().min(1),
  versionPolicy: z.enum(["pin-exact", "auto-patch", "auto-minor", "always-latest"]).optional(),
  config: z.record(z.unknown()).optional(),
});

const updatePolicySchema = z.object({
  versionPolicy: z.enum(["pin-exact", "auto-patch", "auto-minor", "always-latest"]),
});

const updateConfigSchema = z.object({
  config: z.record(z.unknown()),
});

export function agentBindingRoutes(db: Db) {
  const router = Router();
  const skillBindings = agentSkillBindingService(db);
  const toolBindings = agentToolBindingService(db);
  const agents = agentService(db);

  // ============================================
  // AGENT SKILLS
  // ============================================

  /**
   * List skills attached to an agent
   * GET /agents/:agentId/skills
   */
  router.get("/agents/:agentId/skills", async (req, res) => {
    const agentId = req.params.agentId as string;
    
    const agent = await agents.getById(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    assertCompanyAccess(req, agent.companyId);

    const skills = await skillBindings.listForAgent(agentId);
    res.json(skills);
  });

  /**
   * Attach a skill to an agent
   * POST /agents/:agentId/skills
   */
  router.post(
    "/agents/:agentId/skills",
    validate(attachSkillSchema),
    async (req, res) => {
      const agentId = req.params.agentId as string;
      
      const agent = await agents.getById(agentId);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      assertCompanyAccess(req, agent.companyId);

      const actor = getActorInfo(req);
      const body = req.body as z.infer<typeof attachSkillSchema>;

      try {
        const binding = await skillBindings.attach(agentId, {
          skillId: body.skillId,
          version: body.version,
          versionPolicy: body.versionPolicy,
          attachedBy: actor.actorId,
        });

        await logActivity(db, {
          companyId: agent.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "agent.skill_attached",
          entityType: "agent",
          entityId: agentId,
          details: {
            skillId: body.skillId,
            version: body.version,
            versionPolicy: body.versionPolicy ?? "auto-minor",
          },
        });

        res.status(201).json(binding);
      } catch (err: any) {
        if (err.code === "23505") {
          res.status(409).json({ error: "Skill already attached" });
          return;
        }
        throw err;
      }
    }
  );

  /**
   * Update skill version policy
   * PATCH /agents/:agentId/skills/:skillId
   */
  router.patch(
    "/agents/:agentId/skills/:skillId",
    validate(updatePolicySchema),
    async (req, res) => {
      const agentId = req.params.agentId as string;
      const skillId = req.params.skillId as string;
      
      const agent = await agents.getById(agentId);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      assertCompanyAccess(req, agent.companyId);

      const body = req.body as z.infer<typeof updatePolicySchema>;
      const updated = await skillBindings.updatePolicy(agentId, skillId, body.versionPolicy);
      
      if (!updated) {
        res.status(404).json({ error: "Skill binding not found" });
        return;
      }

      res.json(updated);
    }
  );

  /**
   * Detach a skill from an agent
   * DELETE /agents/:agentId/skills/:skillId
   */
  router.delete("/agents/:agentId/skills/:skillId", async (req, res) => {
    const agentId = req.params.agentId as string;
      const skillId = req.params.skillId as string;

    const agent = await agents.getById(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    assertCompanyAccess(req, agent.companyId);

    const removed = await skillBindings.detach(agentId, skillId);
    if (!removed) {
      res.status(404).json({ error: "Skill binding not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: agent.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "agent.skill_detached",
      entityType: "agent",
      entityId: agentId,
      details: { skillId },
    });

    res.status(204).send();
  });

  // ============================================
  // AGENT TOOLS
  // ============================================

  /**
   * List tools attached to an agent
   * GET /agents/:agentId/tools
   */
  router.get("/agents/:agentId/tools", async (req, res) => {
    const agentId = req.params.agentId as string;
    
    const agent = await agents.getById(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    assertCompanyAccess(req, agent.companyId);

    const tools = await toolBindings.listForAgent(agentId);
    res.json(tools);
  });

  /**
   * Attach a tool to an agent
   * POST /agents/:agentId/tools
   */
  router.post(
    "/agents/:agentId/tools",
    validate(attachToolSchema),
    async (req, res) => {
      const agentId = req.params.agentId as string;
      
      const agent = await agents.getById(agentId);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      assertCompanyAccess(req, agent.companyId);

      const actor = getActorInfo(req);
      const body = req.body as z.infer<typeof attachToolSchema>;

      try {
        const binding = await toolBindings.attach(agentId, {
          toolId: body.toolId,
          version: body.version,
          versionPolicy: body.versionPolicy,
          config: body.config,
          attachedBy: actor.actorId,
        });

        await logActivity(db, {
          companyId: agent.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "agent.tool_attached",
          entityType: "agent",
          entityId: agentId,
          details: {
            toolId: body.toolId,
            version: body.version,
          },
        });

        res.status(201).json(binding);
      } catch (err: any) {
        if (err.code === "23505") {
          res.status(409).json({ error: "Tool already attached" });
          return;
        }
        throw err;
      }
    }
  );

  /**
   * Update tool config
   * PATCH /agents/:agentId/tools/:toolId
   */
  router.patch(
    "/agents/:agentId/tools/:toolId",
    validate(updateConfigSchema),
    async (req, res) => {
      const agentId = req.params.agentId as string;
      const toolId = req.params.toolId as string;
      
      const agent = await agents.getById(agentId);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      assertCompanyAccess(req, agent.companyId);

      const body = req.body as z.infer<typeof updateConfigSchema>;
      const updated = await toolBindings.updateConfig(agentId, toolId, body.config);
      
      if (!updated) {
        res.status(404).json({ error: "Tool binding not found" });
        return;
      }

      res.json(updated);
    }
  );

  /**
   * Detach a tool from an agent
   * DELETE /agents/:agentId/tools/:toolId
   */
  router.delete("/agents/:agentId/tools/:toolId", async (req, res) => {
    const agentId = req.params.agentId as string;
      const toolId = req.params.toolId as string;

    const agent = await agents.getById(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    assertCompanyAccess(req, agent.companyId);

    const removed = await toolBindings.detach(agentId, toolId);
    if (!removed) {
      res.status(404).json({ error: "Tool binding not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: agent.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "agent.tool_detached",
      entityType: "agent",
      entityId: agentId,
      details: { toolId },
    });

    res.status(204).send();
  });

  return router;
}
