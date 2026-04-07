import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
import { asString, asNumber } from "../utils.js";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, context } = ctx;

  const adaServiceUrl = asString(config.adaServiceUrl, "http://localhost:8101").replace(/\/+$/, "");
  const team = asString(config.team, "default");
  const workers = asString(config.workers, "");
  const workDir = asString(config.workDir, "");
  const timeoutSec = asNumber(config.timeoutSec, 600);
  const timeoutMs = timeoutSec * 1000;

  // Extract the task from context — check keys in priority order
  const task =
    asString(context.prompt, "") ||
    asString(context.issueBody, "") ||
    asString(context.task, "");
  if (!task) {
    throw new Error("Kimi orchestrator adapter: no task found in context (checked prompt, issueBody, task)");
  }

  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let timedOut = false;

  try {
    // 1. POST to start execution
    const startRes = await fetch(`${adaServiceUrl}/v1/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task,
        team,
        workers: workers || undefined,
        work_dir: workDir || undefined,
        run_id: runId,
      }),
      signal: controller.signal,
    });

    if (!startRes.ok) {
      const body = await startRes.text().catch(() => "");
      throw new Error(`Kimi orchestrator execute failed with status ${startRes.status}: ${body}`);
    }

    const startData = (await startRes.json()) as { execution_id: string };
    const executionId = startData.execution_id;

    // 2. Connect to SSE stream
    let exitCode: number | null = null;
    let summary: string | null = null;

    const streamRes = await fetch(`${adaServiceUrl}/v1/execute/${executionId}/stream`, {
      method: "GET",
      headers: { accept: "text/event-stream" },
      signal: controller.signal,
    });

    if (!streamRes.ok) {
      throw new Error(`Kimi orchestrator stream failed with status ${streamRes.status}`);
    }

    if (streamRes.body) {
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last partial line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              if (currentEvent === "log") {
                const parsed = JSON.parse(dataStr) as { stream: "stdout" | "stderr"; chunk: string };
                await ctx.onLog(parsed.stream, parsed.chunk);
              } else if (currentEvent === "status") {
                const parsed = JSON.parse(dataStr) as { exit_code?: number; summary?: string };
                if (parsed.exit_code !== undefined) exitCode = parsed.exit_code;
                if (parsed.summary) summary = parsed.summary;
              }
            } catch {
              // Ignore malformed SSE data lines
            }
            currentEvent = "";
          }
        }
      }
    }

    // 3. GET result metadata
    let resultJson: Record<string, unknown> | null = null;
    let costUsd: number | null = 0;

    try {
      const resultRes = await fetch(`${adaServiceUrl}/v1/execute/${executionId}/result`, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (resultRes.ok) {
        const resultData = (await resultRes.json()) as Record<string, unknown>;
        resultJson = resultData;
        if (typeof resultData.cost_usd === "number") {
          costUsd = resultData.cost_usd;
        }
        if (typeof resultData.exit_code === "number" && exitCode === null) {
          exitCode = resultData.exit_code as number;
        }
        if (typeof resultData.summary === "string" && !summary) {
          summary = resultData.summary as string;
        }
      }
    } catch {
      // Result endpoint is best-effort
    }

    return {
      exitCode: exitCode ?? 0,
      signal: null,
      timedOut: false,
      provider: "kimi-k2.5",
      model: "kimi-k2.5:cloud",
      costUsd,
      resultJson,
      summary,
    };
  } catch (err) {
    if (controller.signal.aborted) {
      timedOut = true;
    }
    if (timedOut) {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `Kimi orchestrator timed out after ${timeoutSec}s`,
        provider: "kimi-k2.5",
        model: "kimi-k2.5:cloud",
        costUsd: 0,
      };
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
