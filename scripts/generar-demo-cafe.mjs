import { createFunctionalExampleSeed } from "../src/modulo-procesos-capacidad-planeacion/index.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pickIds(items = []) {
  return new Set(items.map((item) => item.id));
}

const seed = clone(createFunctionalExampleSeed());

const coffeeProduct = seed.entities.products.find((item) => item.code === "PRD-CAFE-TOSTADO");
if (!coffeeProduct) {
  throw new Error("No se encontro el producto demo de cafe.");
}

const coffeeFlow = seed.entities.flowVersions.find((item) => item.productId === coffeeProduct.id);
if (!coffeeFlow) {
  throw new Error("No se encontro el flujo demo de cafe.");
}

const coffeeBatch = seed.entities.batches.find((item) => item.productId === coffeeProduct.id);
if (!coffeeBatch) {
  throw new Error("No se encontro el lote demo de cafe.");
}

const coffeeStages = seed.entities.processStages.filter((item) => item.flowVersionId === coffeeFlow.id);
const coffeeStageIds = pickIds(coffeeStages);

const coffeeFormula = seed.entities.masterFormulas.find((item) => item.flowVersionId === coffeeFlow.id);
const coffeeMaterialIds = new Set((coffeeFormula?.items || []).map((item) => item.materialId));
const coffeeMaterials = seed.entities.materials.filter((item) => coffeeMaterialIds.has(item.id));

const coffeeExecutions = seed.entities.stageExecutions.filter((item) => item.batchId === coffeeBatch.id);
const lineIds = new Set([coffeeFlow.lineId, coffeeBatch.lineId, ""]);
coffeeStages.forEach((stage) => lineIds.add(stage.lineId));

const stageResourceIds = new Set(coffeeStages.flatMap((stage) => stage.defaultResourceIds || []));
const executionResourceIds = new Set(coffeeExecutions.flatMap((execution) => execution.resourceIds || []));
const resourceIds = new Set([...stageResourceIds, ...executionResourceIds]);

const stageEquipmentIds = new Set(coffeeStages.flatMap((stage) => stage.defaultEquipmentIds || []));
const executionEquipmentIds = new Set(coffeeExecutions.flatMap((execution) => execution.equipmentIds || []));
const equipmentIds = new Set([...stageEquipmentIds, ...executionEquipmentIds]);

const resources = seed.entities.resources.filter((item) => resourceIds.has(item.id));
resources.forEach((item) => lineIds.add(item.lineId));

const equipments = seed.entities.equipments.filter((item) => equipmentIds.has(item.id));
equipments.forEach((item) => lineIds.add(item.lineId));

const productionLines = seed.entities.productionLines.filter((item) => lineIds.has(item.id));
const areas = seed.entities.areas.filter((item) => {
  return lineIds.has(item.lineId)
    || resources.some((resource) => resource.areaId === item.id)
    || equipments.some((equipment) => equipment.areaId === item.id);
});

const areaIds = pickIds(areas);
const normalizedResources = resources.map((item) => ({ ...item, areaId: areaIds.has(item.areaId) ? item.areaId : "" }));
const normalizedEquipments = equipments.map((item) => ({ ...item, areaId: areaIds.has(item.areaId) ? item.areaId : "" }));

const calendarEntries = seed.entities.calendarEntries.filter((item) => {
  return lineIds.has(item.lineId) && (item.plannedBatchIds || []).includes(coffeeBatch.id);
});

const warehouseRequirements = seed.entities.warehouseRequirements.filter((item) => item.batchId === coffeeBatch.id || item.productId === coffeeProduct.id);

const data = {
  ...seed,
  metadata: {
    ...seed.metadata,
    moduleName: "Modulo de Procesos, Capacidad y Planeacion · Demo cafe",
    generatedFor: "Cafe tostado molido 250 g",
  },
  entities: {
    ...seed.entities,
    products: [coffeeProduct],
    productionLines,
    areas,
    resources: normalizedResources,
    equipments: normalizedEquipments,
    materials: coffeeMaterials,
    flowVersions: [{ ...coffeeFlow, stageIds: coffeeStages.map((item) => item.id), formulaId: coffeeFormula?.id || "" }],
    processStages: coffeeStages,
    masterFormulas: coffeeFormula ? [coffeeFormula] : [],
    batches: [coffeeBatch],
    stageExecutions: coffeeExecutions,
    calendarEntries,
    warehouseRequirements,
  },
};

process.stdout.write(JSON.stringify(data, null, 2));
