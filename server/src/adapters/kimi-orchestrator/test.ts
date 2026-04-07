import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { asString, parseObject } from "../utils.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const adaServiceUrl = asString(config.adaServiceUrl, "http://localhost:8101").replace(/\/+$/, "");

  if (!adaServiceUrl) {
    checks.push({
      code: "kimi_url_missing",
      level: "error",
      message: "Kimi orchestrator adapter requires adaServiceUrl.",
      hint: "Set adapterConfig.adaServiceUrl to the ada-orchestration service URL.",
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  let url: URL | null = null;
  try {
    url = new URL(adaServiceUrl);
  } catch {
    checks.push({
      code: "kimi_url_invalid",
      level: "error",
      message: `Invalid URL: ${adaServiceUrl}`,
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  checks.push({
    code: "kimi_url_valid",
    level: "info",
    message: `Configured ada-orchestration URL: ${url.toString()}`,
  });

  // Probe the health endpoint
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${adaServiceUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    if (response.ok) {
      checks.push({
        code: "kimi_health_ok",
        level: "info",
        message: "Ada orchestration service health check passed.",
      });
    } else {
      checks.push({
        code: "kimi_health_unexpected_status",
        level: "warn",
        message: `Health endpoint returned HTTP ${response.status}.`,
        hint: "Verify the ada-orchestration service is running and reachable.",
      });
    }
  } catch (err) {
    checks.push({
      code: "kimi_health_probe_failed",
      level: "warn",
      message: err instanceof Error ? err.message : "Health probe failed",
      hint: "This may be expected if the service is not yet running; verify connectivity before invoking runs.",
    });
  } finally {
    clearTimeout(timeout);
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
