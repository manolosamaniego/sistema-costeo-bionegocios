import {
  InMemoryProcessPlanningRepository,
  ProcessPlanningModuleService,
  buildOptionalCostIntegrationPayload,
  createFunctionalExampleSeed,
  createStarterModuleSeed,
} from "../src/modulo-procesos-capacidad-planeacion/index.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const repository = new InMemoryProcessPlanningRepository(createStarterModuleSeed());
const service = new ProcessPlanningModuleService(repository);

const line = (await service.list("productionLine"))[0];
const product = (await service.list("product"))[0];
const flow = (await service.list("flowVersion"))[0];
const area = (await service.list("area"))[0];

const createdUnit = await service.create("unitDefinition", {
  code: "pallet_slot",
  name: "Posicion de pallet",
  symbol: "slot",
  dimension: "count",
  baseUnitCode: "unit",
  toBaseFactor: 1,
});
assert(createdUnit.code === "pallet_slot", "Debe crear unidades.");

const createdResource = await service.create("resource", {
  code: "RES-AUX",
  name: "Auxiliar",
  lineId: line.id,
  areaId: area.id,
  capacityUnitCode: "hour",
  nominalCapacityPerDay: 8,
});
assert(createdResource.lineId === line.id, "Debe crear recursos.");

const createdBatch = await service.create("batch", {
  batchCode: "LOTE-TEST-002",
  productId: product.id,
  flowVersionId: flow.id,
  lineId: line.id,
  plannedQuantity: 250,
  plannedUnitCode: "kg",
  plannedStartDate: "2026-05-03",
  plannedEndDate: "2026-05-03",
});
assert(createdBatch.batchCode === "LOTE-TEST-002", "Debe crear lotes.");

const stage = (await service.list("processStage"))[0];
await service.registerStageTraceability(createdBatch.id, {
  stageId: stage.id,
  sequence: 1,
  inputLotCode: "MP-001",
  outputLotCode: "INT-001",
  inputQuantity: 250,
  inputUnitCode: "kg",
  outputQuantity: 240,
  outputUnitCode: "kg",
  wasteQuantity: 10,
  wasteUnitCode: "kg",
  traceLinks: [{ id: "trace_test_1", inputLotCode: "MP-001", outputLotCode: "INT-001", quantity: 250, unitCode: "kg" }],
});

const waste = await service.getWasteSummary(createdBatch.id);
assert(waste.totalWaste === 10, "Debe calcular merma total.");

const capacity = await service.getCapacityByFlow(flow.id, "day");
assert(capacity.byStage.length > 0, "Debe calcular capacidad por flujo.");

const bottleneck = await service.getBottleneck(flow.id, "day");
assert(Boolean(bottleneck.bottleneckStageId), "Debe detectar cuello de botella.");

const requirements = await service.getMaterialRequirements(createdBatch.id);
assert(requirements.valid, "Debe calcular requerimientos de materiales.");
assert(requirements.items.length > 0, "Debe devolver items de formula.");

const plan = await service.planBatch(createdBatch.id);
assert(plan.stagePlan.length > 0, "Debe planificar etapas del lote.");

const warehouse = await service.getWarehouseNeeds(createdBatch.id, {
  areaPerUnit: 0.02,
  volumePerUnit: 0.01,
  positionsPerUnit: 0.04,
});
assert(warehouse.requiredAreaM2 > 0, "Debe calcular necesidad de bodega.");

const integration = buildOptionalCostIntegrationPayload(await service.load(), { batchId: createdBatch.id });
assert(Array.isArray(integration.materials) && integration.materials.length > 0, "Debe exportar integración opcional a costos.");

const functionalRepository = new InMemoryProcessPlanningRepository(createFunctionalExampleSeed());
const functionalService = new ProcessPlanningModuleService(functionalRepository);
const functionalFlows = await functionalService.list("flowVersion");
assert(functionalFlows.length >= 5, "Debe existir un seed funcional con varias familias.");
const functionalBatches = await functionalService.list("batch");
assert(functionalBatches.length >= 5, "Cada familia debe tener al menos un lote demo.");

console.log(JSON.stringify({
  ok: true,
  createdUnit: createdUnit.code,
  createdResource: createdResource.code,
  batch: createdBatch.batchCode,
  waste,
  bottleneck,
  requirementItems: requirements.items.length,
  plannedStages: plan.stagePlan.length,
  warehouse,
  functionalFamilies: functionalFlows.length,
  functionalBatches: functionalBatches.length,
}, null, 2));
