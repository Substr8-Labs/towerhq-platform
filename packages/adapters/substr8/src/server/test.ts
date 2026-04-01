import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@paperclipai/adapter-utils";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentTestResult["checks"] = [];
  
  // Check GAM connectivity
  const gamUrl = (ctx.config.gamUrl as string) || process.env.GAM_URL || "http://localhost:8091";
  try {
    const response = await fetch(`${gamUrl}/health`, { method: "GET" });
    if (response.ok) {
      checks.push({
        code: "gam_health",
        level: "info",
        message: "GAM service is reachable",
        detail: gamUrl,
      });
    } else {
      checks.push({
        code: "gam_health",
        level: "warn",
        message: "GAM service returned non-OK status",
        detail: `${gamUrl} returned ${response.status}`,
      });
    }
  } catch (error) {
    checks.push({
      code: "gam_health",
      level: "warn",
      message: "GAM service not reachable",
      detail: `Could not connect to ${gamUrl}`,
      hint: "Set GAM_URL environment variable or gamUrl in adapter config",
    });
  }

  // Check RunProof connectivity (optional)
  const runproofUrl = (ctx.config.runproofUrl as string) || process.env.RUNPROOF_URL;
  if (runproofUrl) {
    try {
      const response = await fetch(`${runproofUrl}/health`, { method: "GET" });
      if (response.ok) {
        checks.push({
          code: "runproof_health",
          level: "info",
          message: "RunProof service is reachable",
          detail: runproofUrl,
        });
      } else {
        checks.push({
          code: "runproof_health",
          level: "warn",
          message: "RunProof service returned non-OK status",
          detail: `${runproofUrl} returned ${response.status}`,
        });
      }
    } catch {
      checks.push({
        code: "runproof_health",
        level: "warn",
        message: "RunProof service not reachable",
        detail: `Could not connect to ${runproofUrl}`,
      });
    }
  }

  const hasErrors = checks.some((c) => c.level === "error");
  const hasWarnings = checks.some((c) => c.level === "warn");

  return {
    adapterType: "substr8",
    status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
