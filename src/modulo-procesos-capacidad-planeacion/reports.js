import {
  buildEntityRelations,
  calculateFlowCapacityByPeriod,
  calculateFlowWasteSummary,
  calculateMaterialRequirementsForBatch,
  calculateWarehouseNeeds,
  detectFlowBottleneck,
  planProductionBatch,
} from "./services.js";
import { migrateProcessPlanningPayload } from "./migrations.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 2) {
  return Number(num(value).toFixed(decimals));
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

export function buildOperationalDashboard(data) {
  const model = migrateProcessPlanningPayload(data);
  const products = model.entities.products.length;
  const flows = model.entities.flowVersions.length;
  const stages = model.entities.processStages.length;
  const batches = model.entities.batches.length;
  const sharedPackLineId = model.entities.productionLines.find((line) => line.code === "LINEA-PACK")?.id;
  const sharedResourceCodes = model.entities.resources
    .filter((item) => item.lineId === sharedPackLineId)
    .map((item) => item.code);
  const multiDayFlows = model.entities.flowVersions.filter((item) => item.durationMode === "multi_day").length;
  const shortFlows = model.entities.flowVersions.filter((item) => item.durationMode === "same_day").length;
  const stageExecutions = model.entities.stageExecutions.length;
  const totalWasteByUnit = model.entities.stageExecutions.reduce((acc, execution) => {
    const unitCode = execution.wasteUnitCode || "unknown";
    acc[unitCode] = round((acc[unitCode] || 0) + num(execution.wasteQuantity), 2);
    return acc;
  }, {});

  const bottlenecks = model.entities.flowVersions.map((flow) => detectFlowBottleneck(model, { flowVersionId: flow.id, period: "day" }));

  return {
    summary: {
      products,
      flows,
      stages,
      batches,
      stageExecutions,
      totalWasteByUnit,
      multiDayFlows,
      shortFlows,
      sharedResourceCodes,
    },
    bottlenecks,
    relations: buildEntityRelations(model),
  };
}

export function buildCapacityReport(data, period = "day") {
  const model = migrateProcessPlanningPayload(data);
  return model.entities.flowVersions.map((flow) => ({
    flowId: flow.id,
    flowCode: flow.code,
    flowName: flow.name,
    period,
    ...calculateFlowCapacityByPeriod(model, { flowVersionId: flow.id, period }),
  }));
}

export function buildWasteReport(data) {
  const model = migrateProcessPlanningPayload(data);
  const productsById = byId(model.entities.products);
  return model.entities.batches.map((batch) => ({
    batchId: batch.id,
    batchCode: batch.batchCode,
    productName: productsById.get(batch.productId)?.name || "",
    ...calculateFlowWasteSummary(model, batch.id),
  }));
}

export function buildRequirementsReport(data) {
  const model = migrateProcessPlanningPayload(data);
  const productsById = byId(model.entities.products);
  return model.entities.batches.map((batch) => ({
    batchId: batch.id,
    batchCode: batch.batchCode,
    productName: productsById.get(batch.productId)?.name || "",
    requirements: calculateMaterialRequirementsForBatch(model, { batchId: batch.id }),
  }));
}

export function buildWarehouseReport(data) {
  const model = migrateProcessPlanningPayload(data);
  return model.entities.batches.map((batch) => ({
    batchId: batch.id,
    batchCode: batch.batchCode,
    defaultNeed: calculateWarehouseNeeds(model, {
      batchId: batch.id,
      areaPerUnit: 0.02,
      volumePerUnit: 0.01,
      positionsPerUnit: 0.04,
    }),
  }));
}

export function buildPlanningReport(data) {
  const model = migrateProcessPlanningPayload(data);
  return model.entities.batches.map((batch) => ({
    batchId: batch.id,
    batchCode: batch.batchCode,
    plan: planProductionBatch(model, { batchId: batch.id }),
  }));
}

export function buildInternalModuleBrief(data) {
  const dashboard = buildOperationalDashboard(data);
  const wasteSummary = Object.entries(dashboard.summary.totalWasteByUnit)
    .map(([unitCode, quantity]) => `${quantity} ${unitCode}`)
    .join(", ");

  return {
    title: "Resumen interno del modulo de Procesos, Capacidad y Planeacion",
    bullets: [
      `Productos demo cargados: ${dashboard.summary.products}.`,
      `Flujos demo cargados: ${dashboard.summary.flows}, de los cuales ${dashboard.summary.multiDayFlows} son de varios dias y ${dashboard.summary.shortFlows} son de proceso corto.`,
      `Recursos compartidos destacados: ${dashboard.summary.sharedResourceCodes.join(", ") || "N/D"}.`,
      `Mermas registradas por unidad: ${wasteSummary || "N/D"}.`,
      "Cada lote demo ya tiene trazabilidad por etapa, requerimientos calculables y lectura de bodega.",
    ],
  };
}
