import { BrowserLocalStorageProcessPlanningRepository } from "./repositories.js";
import { ProcessPlanningModuleService } from "./services.js";
import { ProcessPlanningError } from "./errors.js";

function getInvoke() {
  return globalThis.window?.__TAURI__?.core?.invoke || globalThis.__TAURI__?.core?.invoke || null;
}

function normalizeError(error) {
  if (error instanceof ProcessPlanningError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  return {
    ok: false,
    code: "unexpected_error",
    message: String(error?.message || error || "Error no controlado."),
    details: {},
  };
}

export function createProcessPlanningActions(repository = new BrowserLocalStorageProcessPlanningRepository()) {
  const service = new ProcessPlanningModuleService(repository);

  return {
    service,
    async execute(actionName, payload = {}) {
      try {
        switch (actionName) {
          case "list":
            return { ok: true, data: await service.list(payload.entityName) };
          case "get":
            return { ok: true, data: await service.getById(payload.entityName, payload.id) };
          case "create":
            return { ok: true, data: await service.create(payload.entityName, payload.input || {}) };
          case "update":
            return { ok: true, data: await service.update(payload.entityName, payload.id, payload.patch || {}) };
          case "remove":
            return { ok: true, data: await service.remove(payload.entityName, payload.id) };
          case "plan_batch":
            return { ok: true, data: await service.planBatch(payload.batchId) };
          case "traceability":
            return { ok: true, data: await service.getBatchTraceability(payload.batchId) };
          case "waste_summary":
            return { ok: true, data: await service.getWasteSummary(payload.batchId) };
          case "capacity_flow":
            return { ok: true, data: await service.getCapacityByFlow(payload.flowVersionId, payload.period || "day") };
          case "bottleneck":
            return { ok: true, data: await service.getBottleneck(payload.flowVersionId, payload.period || "day") };
          case "material_requirements":
            return { ok: true, data: await service.getMaterialRequirements(payload.batchId, payload.formulaId || "") };
          case "calendar":
            return { ok: true, data: await service.getCalendar(payload.lineId || "", payload.startDate || "", payload.endDate || "") };
          case "warehouse_needs":
            return { ok: true, data: await service.getWarehouseNeeds(payload.batchId, payload.params || {}) };
          case "register_traceability":
            return { ok: true, data: await service.registerStageTraceability(payload.batchId, payload.input || {}) };
          default:
            throw new ProcessPlanningError("action_not_supported", `La accion ${actionName} no esta soportada.`, { actionName });
        }
      } catch (error) {
        return normalizeError(error);
      }
    },
    async loadDesktopFile() {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "La carga nativa solo esta disponible en la app de escritorio.");
      return invoke("import_process_planning_file");
    },
    async saveDesktopFile(contents, suggestedName) {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "La exportacion nativa solo esta disponible en la app de escritorio.");
      return invoke("export_process_planning_file", { contents, suggestedName });
    },
    async loadDesktopStore() {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "La carga de almacenamiento local solo esta disponible en escritorio.");
      return invoke("load_process_planning_store");
    },
    async saveDesktopStore(contents) {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "El guardado de almacenamiento local solo esta disponible en escritorio.");
      return invoke("save_process_planning_store", { contents });
    },
    async exportCostIntegration(contents, suggestedName) {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "La exportacion de integracion solo esta disponible en escritorio.");
      return invoke("export_process_planning_cost_integration_file", { contents, suggestedName });
    },
    async exportPdfA4(html, suggestedName) {
      const invoke = getInvoke();
      if (!invoke) throw new ProcessPlanningError("desktop_unavailable", "La exportacion PDF solo esta disponible en la app de escritorio.");
      return invoke("export_report_pdf_a4", { html, suggestedName });
    },
  };
}
