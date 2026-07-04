import {
  buildCapacityReport,
  buildOperationalDashboard,
  buildPlanningReport,
  buildRequirementsReport,
  buildWasteReport,
  buildWarehouseReport,
  buildOptionalCostIntegrationPayload,
  createFunctionalExampleSeed,
  validateProcessPlanningData,
} from "../src/modulo-procesos-capacidad-planeacion/index.js";

function ensure(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

const data = createFunctionalExampleSeed();
const validation = validateProcessPlanningData(data);
ensure(validation.valid, "La semilla funcional no paso la validacion.", { issues: validation.issues });

const dashboard = buildOperationalDashboard(data);
const capacityDay = buildCapacityReport(data, "day");
const capacityWeek = buildCapacityReport(data, "week");
const capacityMonth = buildCapacityReport(data, "month");
const planning = buildPlanningReport(data);
const waste = buildWasteReport(data);
const requirements = buildRequirementsReport(data);
const warehouse = buildWarehouseReport(data);

ensure(capacityDay.length > 0, "No se genero capacidad diaria.");
ensure(capacityWeek.length === capacityDay.length, "Capacidad semanal inconsistente.");
ensure(capacityMonth.length === capacityDay.length, "Capacidad mensual inconsistente.");
ensure(planning.length > 0, "No se genero planificacion de lotes.");
ensure(waste.length === planning.length, "El reporte de merma no coincide con la cantidad de lotes.");
ensure(requirements.length === planning.length, "El reporte de requerimientos no coincide con la cantidad de lotes.");
ensure(warehouse.length === planning.length, "El reporte de bodega no coincide con la cantidad de lotes.");

const planningSummary = planning.map((item) => {
  const stagePlan = item.plan?.stagePlan || [];
  ensure(stagePlan.length > 0, "Un lote se quedo sin etapas planificadas.", { batchId: item.batchId, batchCode: item.batchCode });
  return {
    batchCode: item.batchCode,
    stageCount: stagePlan.length,
    start: stagePlan[0]?.startedAt || "",
    end: stagePlan.at(-1)?.endedAt || "",
  };
});

const costPayloads = data.entities.batches.map((batch) => {
  const payload = buildOptionalCostIntegrationPayload(data, { batchId: batch.id });
  ensure(payload, "No se genero payload para Costos.", { batchId: batch.id, batchCode: batch.batchCode });
  ensure((payload.materials || []).length > 0, "El payload a Costos no incluye materiales.", { batchCode: batch.batchCode });
  ensure((payload.equipmentUsage || []).length > 0, "El payload a Costos no incluye uso de equipos.", { batchCode: batch.batchCode });
  return {
    batchCode: batch.batchCode,
    materialItems: (payload.materials || []).length,
    equipmentItems: (payload.equipmentUsage || []).length,
    laborItems: (payload.labor || []).length,
  };
});

const summary = {
  validation: {
    valid: validation.valid,
    issues: validation.issues.length,
  },
  dashboard: dashboard.summary,
  capacity: {
    dayFlows: capacityDay.length,
    weekFlows: capacityWeek.length,
    monthFlows: capacityMonth.length,
    bottlenecks: capacityDay.slice(0, 4).map((item) => ({
      flowName: item.flowName,
      estimatedFlowCapacity: item.estimatedFlowCapacity,
      bottleneck: item.bottleneck?.stageName || "",
      period: item.period,
    })),
  },
  planning: planningSummary,
  waste: waste.map((item) => ({
    batchCode: item.batchCode,
    aggregateMode: item.aggregateMode,
    totalWaste: item.totalWaste,
    totalWastePct: item.totalWastePct,
  })),
  requirements: requirements.map((item) => ({
    batchCode: item.batchCode,
    materialItems: item.requirements?.items?.length || 0,
  })),
  warehouse: warehouse.map((item) => ({
    batchCode: item.batchCode,
    areaM2: item.defaultNeed?.requiredAreaM2 || 0,
    positions: item.defaultNeed?.requiredPositions || 0,
  })),
  costPayloads,
};

console.log(JSON.stringify(summary, null, 2));
