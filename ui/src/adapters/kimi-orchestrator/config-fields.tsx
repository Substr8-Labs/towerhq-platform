import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function KimiOrchestratorConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      <Field label="Ada Service URL">
        <DraftInput
          value={
            isCreate
              ? values!.url
              : eff("adapterConfig", "adaServiceUrl", String(config.adaServiceUrl ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ url: v })
              : mark("adapterConfig", "adaServiceUrl", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://localhost:8101"
        />
      </Field>

      <Field label="Team">
        <DraftInput
          value={
            isCreate
              ? (values as Record<string, string>).team ?? "default"
              : eff("adapterConfig", "team", String(config.team ?? "default"))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ team: v } as Partial<typeof values!>)
              : mark("adapterConfig", "team", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="default"
        />
      </Field>

      <Field label="Workers">
        <DraftInput
          value={
            isCreate
              ? (values as Record<string, string>).workers ?? ""
              : eff("adapterConfig", "workers", String(config.workers ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ workers: v } as Partial<typeof values!>)
              : mark("adapterConfig", "workers", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="scout,code-reviewer"
        />
      </Field>

      <Field label="Working Directory">
        <DraftInput
          value={
            isCreate
              ? (values as Record<string, string>).workDir ?? ""
              : eff("adapterConfig", "workDir", String(config.workDir ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ workDir: v } as Partial<typeof values!>)
              : mark("adapterConfig", "workDir", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="/path/to/project"
        />
      </Field>
    </>
  );
}
