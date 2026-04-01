import { useState } from "react";
import { ChevronDown, ChevronRight, Shield, Database, FileCheck } from "lucide-react";
import type { AdapterConfigFieldsProps, CreateConfigValues } from "../types";
import {
  Field,
  DraftInput,
} from "../../components/agent-config-primitives";
import { getUIAdapter, listUIAdapters } from "../registry";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const selectClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm";

// Extended values type for Substr8 custom fields
type Substr8Values = CreateConfigValues & {
  baseAdapter?: string;
  baseAdapterConfig?: Record<string, unknown>;
  gamUrl?: string;
  runproofUrl?: string;
  governanceMode?: string;
  captureMemory?: boolean;
  createProof?: boolean;
  agentId?: string;
  tenantId?: string;
};

// Get available base adapters (exclude substr8 to prevent recursion)
function getBaseAdapters() {
  return listUIAdapters().filter(a => a.type !== "substr8");
}

export function Substr8ConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Cast values and set for our extended type
  const v = values as Substr8Values | null;
  const setV = set as ((patch: Partial<Substr8Values>) => void) | null;
  
  // Base adapter selection
  const baseAdapter = isCreate
    ? v?.baseAdapter ?? "openclaw_gateway"
    : eff("adapterConfig", "baseAdapter", String(config.baseAdapter ?? "openclaw_gateway"));
  
  const baseAdapterConfig = isCreate
    ? v?.baseAdapterConfig ?? {}
    : (config.baseAdapterConfig as Record<string, unknown>) ?? {};

  // Substr8-specific config
  const gamUrl = isCreate
    ? v?.gamUrl ?? ""
    : eff("adapterConfig", "gamUrl", String(config.gamUrl ?? ""));
  
  const runproofUrl = isCreate
    ? v?.runproofUrl ?? ""
    : eff("adapterConfig", "runproofUrl", String(config.runproofUrl ?? ""));
  
  const governanceMode = isCreate
    ? v?.governanceMode ?? "observe"
    : eff("adapterConfig", "governanceMode", String(config.governanceMode ?? "observe"));
  
  const captureMemory = isCreate
    ? v?.captureMemory ?? true
    : eff("adapterConfig", "captureMemory", config.captureMemory !== false);
  
  const createProof = isCreate
    ? v?.createProof ?? true
    : eff("adapterConfig", "createProof", config.createProof !== false);

  // Get the UI adapter for the selected base adapter
  const baseUIAdapter = getUIAdapter(baseAdapter);
  const BaseConfigFields = baseUIAdapter?.ConfigFields;

  return (
    <div className="space-y-4">
      {/* Substr8 Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground border-b border-border pb-2">
        <Shield className="h-4 w-4" />
        <span>Substr8 Governed Execution</span>
      </div>

      {/* Base Adapter Selection */}
      <Field label="Base Adapter">
        <select
          value={baseAdapter}
          onChange={(e) => {
            if (isCreate && setV) {
              setV({ baseAdapter: e.target.value, baseAdapterConfig: {} });
            } else {
              mark("adapterConfig", "baseAdapter", e.target.value);
              mark("adapterConfig", "baseAdapterConfig", {});
            }
          }}
          className={selectClass}
        >
          {getBaseAdapters().map((adapter) => (
            <option key={adapter.type} value={adapter.type}>
              {adapter.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-muted-foreground mt-1">
          The underlying adapter that executes tasks. Substr8 wraps it with governance.
        </div>
      </Field>

      {/* Base Adapter Config (Nested) */}
      {BaseConfigFields && (
        <div className="border border-border rounded-md p-3 bg-muted/20">
          <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <span>{baseUIAdapter.label} Configuration</span>
          </div>
          <BaseConfigFields
            mode={isCreate ? "create" : "edit"}
            isCreate={isCreate}
            adapterType={baseAdapter}
            values={isCreate ? (baseAdapterConfig as unknown as CreateConfigValues) : null}
            set={isCreate ? (patch: Partial<CreateConfigValues>) => {
              if (setV) {
                setV({ baseAdapterConfig: { ...baseAdapterConfig, ...patch } });
              }
            } : null}
            config={baseAdapterConfig}
            eff={(group, field, original) => {
              if (group === "adapterConfig") {
                const val = (baseAdapterConfig as Record<string, unknown>)[field];
                return val !== undefined ? val as typeof original : original;
              }
              return original;
            }}
            mark={(group, field, value) => {
              if (group === "adapterConfig") {
                const newConfig = { ...baseAdapterConfig, [field]: value };
                if (value === undefined) delete newConfig[field];
                mark("adapterConfig", "baseAdapterConfig", newConfig);
              }
            }}
            models={models}
          />
        </div>
      )}

      {/* Substr8 Settings */}
      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Database className="h-4 w-4 text-blue-500" />
          <span>Memory (GAM)</span>
        </div>
        
        <Field label="GAM URL">
          <DraftInput
            value={gamUrl}
            onCommit={(val) => {
              if (isCreate && setV) {
                setV({ gamUrl: val || undefined });
              } else {
                mark("adapterConfig", "gamUrl", val || undefined);
              }
            }}
            immediate
            className={inputClass}
            placeholder="https://gam-service-production.up.railway.app"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Leave empty to use GAM_URL environment variable or localhost:8091
          </div>
        </Field>

        <div className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            id="captureMemory"
            checked={captureMemory}
            onChange={(e) => {
              if (isCreate && setV) {
                setV({ captureMemory: e.target.checked });
              } else {
                mark("adapterConfig", "captureMemory", e.target.checked);
              }
            }}
            className="rounded border-border"
          />
          <label htmlFor="captureMemory" className="text-sm">
            Capture execution context to memory
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <FileCheck className="h-4 w-4 text-green-500" />
          <span>Proof (RunProof)</span>
        </div>
        
        <Field label="RunProof URL">
          <DraftInput
            value={runproofUrl}
            onCommit={(val) => {
              if (isCreate && setV) {
                setV({ runproofUrl: val || undefined });
              } else {
                mark("adapterConfig", "runproofUrl", val || undefined);
              }
            }}
            immediate
            className={inputClass}
            placeholder="https://runproof-api-production.up.railway.app"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Leave empty to disable proof generation
          </div>
        </Field>

        <div className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            id="createProof"
            checked={createProof}
            onChange={(e) => {
              if (isCreate && setV) {
                setV({ createProof: e.target.checked });
              } else {
                mark("adapterConfig", "createProof", e.target.checked);
              }
            }}
            className="rounded border-border"
          />
          <label htmlFor="createProof" className="text-sm">
            Create cryptographic proof for each run
          </label>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Advanced Settings
        </button>
        
        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <Field label="Governance Mode">
              <select
                value={governanceMode}
                onChange={(e) => {
                  if (isCreate && setV) {
                    setV({ governanceMode: e.target.value });
                  } else {
                    mark("adapterConfig", "governanceMode", e.target.value);
                  }
                }}
                className={selectClass}
              >
                <option value="observe">Observe (log only)</option>
                <option value="enforce">Enforce (block violations)</option>
                <option value="audit">Audit (detailed logging)</option>
              </select>
              <div className="text-xs text-muted-foreground mt-1">
                How strictly to enforce governance policies
              </div>
            </Field>

            <Field label="Agent ID (for memory scoping)">
              <DraftInput
                value={isCreate ? v?.agentId ?? "" : eff("adapterConfig", "agentId", String(config.agentId ?? ""))}
                onCommit={(val) => {
                  if (isCreate && setV) {
                    setV({ agentId: val || undefined });
                  } else {
                    mark("adapterConfig", "agentId", val || undefined);
                  }
                }}
                immediate
                className={inputClass}
                placeholder="Leave empty to use agent name"
              />
            </Field>

            <Field label="Tenant ID">
              <DraftInput
                value={isCreate ? v?.tenantId ?? "" : eff("adapterConfig", "tenantId", String(config.tenantId ?? ""))}
                onCommit={(val) => {
                  if (isCreate && setV) {
                    setV({ tenantId: val || undefined });
                  } else {
                    mark("adapterConfig", "tenantId", val || undefined);
                  }
                }}
                immediate
                className={inputClass}
                placeholder="default"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
