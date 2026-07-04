import { migrateProcessPlanningPayload } from "./migrations.js";
import { validateCompatibleUnitPair, validateProcessPlanningData } from "./validation.js";
import {
  createArea,
  createBatch,
  createEquipment,
  createFlowVersion,
  createMasterFormula,
  createMaterial,
  createProcessStage,
  createProduct,
  createProductionLine,
  createResource,
  createStageExecution,
  createUnitConversion,
  createUnitDefinition,
  createWarehouseRequirement,
} from "./schema.js";
import { ensure, ProcessPlanningError } from "./errors.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 4) {
  return Number(num(value).toFixed(decimals));
}

function groupBy(items = [], keySelector) {
  return items.reduce((acc, item) => {
    const key = keySelector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

const ENTITY_COLLECTIONS = {
  product: "products",
  productionLine: "productionLines",
  area: "areas",
  unitDefinition: "unitDefinitions",
  unitConversion: "unitConversions",
  resource: "resources",
  equipment: "equipments",
  material: "materials",
  flowVersion: "flowVersions",
  processStage: "processStages",
  masterFormula: "masterFormulas",
  batch: "batches",
  stageExecution: "stageExecutions",
  calendarEntry: "calendarEntries",
  warehouseRequirement: "warehouseRequirements",
};

const ENTITY_FACTORIES = {
  product: createProduct,
  productionLine: createProductionLine,
  area: createArea,
  unitDefinition: createUnitDefinition,
  unitConversion: createUnitConversion,
  resource: createResource,
  equipment: createEquipment,
  material: createMaterial,
  flowVersion: createFlowVersion,
  processStage: createProcessStage,
  masterFormula: createMasterFormula,
  batch: createBatch,
  stageExecution: createStageExecution,
  warehouseRequirement: createWarehouseRequirement,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCollectionRoot(data, entityName) {
  const collectionName = ENTITY_COLLECTIONS[entityName];
  ensure(collectionName, "entity_not_supported", `La entidad ${entityName} no esta soportada.`, { entityName });
  if (data.entities[collectionName]) return { scope: data.entities, collectionName };
  if (data.catalogs[collectionName]) return { scope: data.catalogs, collectionName };
  throw new ProcessPlanningError("entity_collection_missing", `No existe la coleccion para ${entityName}.`, { entityName, collectionName });
}

function getCollection(data, entityName) {
  const { scope, collectionName } = getCollectionRoot(data, entityName);
  return scope[collectionName];
}

function replaceCollection(data, entityName, items) {
  const { scope, collectionName } = getCollectionRoot(data, entityName);
  scope[collectionName] = items;
}

function findById(items, id) {
  return items.find((item) => item.id === id);
}

function ensureUniqueField(items, field, value, currentId = "") {
  if (!value) return;
  const duplicate = items.find((item) => item[field] === value && item.id !== currentId);
  ensure(!duplicate, "duplicate_field", `Ya existe un registro con ${field} ${value}.`, { field, value, currentId });
}

function resolvePeriodHours(period = "day") {
  if (period === "week") return 48;
  if (period === "month") return 192;
  return 8;
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function resolveStageDurationHours(stage = {}) {
  const durationHours = num(stage.durationHours);
  if (durationHours > 0) return durationHours;
  const durationDays = num(stage.durationDays);
  if (durationDays > 0) return durationDays * 24;
  return 0;
}

function areUnitsCompatible(data, fromUnitCode, toUnitCode) {
  if (!fromUnitCode || !toUnitCode) return false;
  return validateCompatibleUnitPair(data, fromUnitCode, toUnitCode);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function buildEntityRelations(data) {
  const model = migrateProcessPlanningPayload(data);
  const stagesByFlow = groupBy(model.entities.processStages, (stage) => stage.flowVersionId || "");
  const flowsByProduct = groupBy(model.entities.flowVersions, (flow) => flow.productId || "");
  const areasByLine = groupBy(model.entities.areas, (area) => area.lineId || "");
  const batchesByFlow = groupBy(model.entities.batches, (batch) => batch.flowVersionId || "");
  const executionsByBatch = groupBy(model.entities.stageExecutions, (execution) => execution.batchId || "");
  const warehouseByBatch = groupBy(model.entities.warehouseRequirements, (item) => item.batchId || "");

  return {
    stagesByFlow,
    flowsByProduct,
    areasByLine,
    batchesByFlow,
    executionsByBatch,
    warehouseByBatch,
  };
}

export function calculateStageExecutionMetrics(stageExecution) {
  const inputQuantity = num(stageExecution.inputQuantity);
  const outputQuantity = num(stageExecution.outputQuantity);
  const wasteQuantity = num(stageExecution.wasteQuantity);
  const yieldPct = inputQuantity > 0 ? round((outputQuantity / inputQuantity) * 100, 2) : 0;
  const totalLossPct = inputQuantity > 0 ? round((wasteQuantity / inputQuantity) * 100, 2) : 0;

  return {
    inputQuantity: round(inputQuantity),
    outputQuantity: round(outputQuantity),
    wasteQuantity: round(wasteQuantity),
    yieldPct,
    totalLossPct,
  };
}

export function calculateBatchTraceability(data, batchId) {
  const model = migrateProcessPlanningPayload(data);
  const executions = model.entities.stageExecutions
    .filter((execution) => execution.batchId === batchId)
    .sort((a, b) => num(a.sequence) - num(b.sequence));
  const stagesById = new Map(model.entities.processStages.map((stage) => [stage.id, stage]));

  return executions.map((execution) => ({
    executionId: execution.id,
    stageId: execution.stageId,
    stageName: stagesById.get(execution.stageId)?.name || "",
    sequence: execution.sequence,
    inputLotCode: execution.inputLotCode,
    outputLotCode: execution.outputLotCode,
    traceLinks: execution.traceLinks || [],
    metrics: calculateStageExecutionMetrics(execution),
  }));
}

export function calculateFlowWasteSummary(data, batchId) {
  const model = migrateProcessPlanningPayload(data);
  const executions = model.entities.stageExecutions
    .filter((execution) => execution.batchId === batchId)
    .sort((a, b) => num(a.sequence) - num(b.sequence));

  const totalsByUnit = {
    input: {},
    output: {},
    waste: {},
  };

  executions.forEach((execution) => {
    const inputUnitCode = execution.inputUnitCode || "unknown";
    const outputUnitCode = execution.outputUnitCode || "unknown";
    const wasteUnitCode = execution.wasteUnitCode || "unknown";

    totalsByUnit.input[inputUnitCode] = round((totalsByUnit.input[inputUnitCode] || 0) + num(execution.inputQuantity));
    totalsByUnit.output[outputUnitCode] = round((totalsByUnit.output[outputUnitCode] || 0) + num(execution.outputQuantity));
    totalsByUnit.waste[wasteUnitCode] = round((totalsByUnit.waste[wasteUnitCode] || 0) + num(execution.wasteQuantity));
  });

  const firstInputUnit = executions[0]?.inputUnitCode || "";
  const comparableOutputs = executions.every((execution) => areUnitsCompatible(model, firstInputUnit, execution.outputUnitCode));
  const comparableInputs = executions.every((execution) => areUnitsCompatible(model, firstInputUnit, execution.inputUnitCode));
  const comparableWaste = executions.every((execution) => areUnitsCompatible(model, firstInputUnit, execution.wasteUnitCode));
  const hasComparableTotals = executions.length > 0 && comparableInputs && comparableOutputs && comparableWaste;

  const totalInput = hasComparableTotals ? executions.reduce((sum, execution) => sum + num(execution.inputQuantity), 0) : 0;
  const totalUseful = hasComparableTotals ? executions.reduce((sum, execution) => sum + num(execution.outputQuantity), 0) : 0;
  const totalWaste = hasComparableTotals ? executions.reduce((sum, execution) => sum + num(execution.wasteQuantity), 0) : 0;

  return {
    totalInput: hasComparableTotals ? round(totalInput) : null,
    totalUseful: hasComparableTotals ? round(totalUseful) : null,
    totalWaste: hasComparableTotals ? round(totalWaste) : null,
    totalYieldPct: hasComparableTotals && totalInput > 0 ? round((totalUseful / totalInput) * 100, 2) : null,
    totalWastePct: hasComparableTotals && totalInput > 0 ? round((totalWaste / totalInput) * 100, 2) : null,
    aggregateMode: hasComparableTotals ? "comparable_totals" : "by_unit",
    comparableUnitCode: hasComparableTotals ? firstInputUnit : "",
    totalsByUnit,
    stageSummaries: executions.map((execution) => ({
      executionId: execution.id,
      stageId: execution.stageId,
      sequence: execution.sequence,
      inputQuantity: round(num(execution.inputQuantity)),
      inputUnitCode: execution.inputUnitCode,
      outputQuantity: round(num(execution.outputQuantity)),
      outputUnitCode: execution.outputUnitCode,
      wasteQuantity: round(num(execution.wasteQuantity)),
      wasteUnitCode: execution.wasteUnitCode,
      yieldPct: calculateStageExecutionMetrics(execution).yieldPct,
    })),
  };
}

export function calculateCapacitySnapshot(data, { lineId = "", stageId = "", equipmentId = "" } = {}) {
  const model = migrateProcessPlanningPayload(data);

  const stages = stageId
    ? model.entities.processStages.filter((stage) => stage.id === stageId)
    : model.entities.processStages.filter((stage) => !lineId || stage.lineId === lineId);

  const equipments = equipmentId
    ? model.entities.equipments.filter((equipment) => equipment.id === equipmentId)
    : model.entities.equipments.filter((equipment) => !lineId || equipment.lineId === lineId);

  const capacityByStage = stages.map((stage) => {
    const durationHours = resolveStageDurationHours(stage);
    return {
    stageId: stage.id,
    stageName: stage.name,
    capacityByRun: num(stage.capacityByRun),
    capacityUnitCode: stage.capacityUnitCode,
    maxCapacityValue: num(stage.maxCapacityValue),
    maxCapacityUnitCode: stage.maxCapacityUnitCode || stage.capacityUnitCode,
    maxCapacityPeriod: stage.maxCapacityPeriod || "day",
    operatorCount: num(stage.operatorCount),
    responsibleRoleNames: stage.responsibleRoleNames || [],
    controlItems: stage.controlItems || [],
    requiredRecordNames: stage.requiredRecordNames || [],
    machineMaterialRefs: stage.machineMaterialRefs || [],
    requiredAreaM2: num(stage.requiredAreaM2),
    durationHours,
    durationDays: num(stage.durationDays),
    estimatedPerDay: durationHours > 0 ? round((num(stage.capacityByRun) * 8) / durationHours, 2) : 0,
    estimatedPerWeek: durationHours > 0 ? round((num(stage.capacityByRun) * 48) / durationHours, 2) : 0,
    estimatedPerMonth: durationHours > 0 ? round((num(stage.capacityByRun) * 192) / durationHours, 2) : 0,
    };
  });

  const capacityByEquipment = equipments.map((equipment) => ({
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    capacityUnitCode: equipment.capacityUnitCode,
    perHour: num(equipment.nominalCapacityPerHour),
    perDay: num(equipment.nominalCapacityPerDay),
    perWeek: num(equipment.nominalCapacityPerWeek),
    perMonth: num(equipment.nominalCapacityPerMonth),
  }));

  return {
    capacityByStage,
    capacityByEquipment,
  };
}

export function calculateFlowCapacityByPeriod(data, { flowVersionId, period = "day" }) {
  const model = migrateProcessPlanningPayload(data);
  const flow = model.entities.flowVersions.find((item) => item.id === flowVersionId);
  ensure(flow, "flow_not_found", "No existe la version de flujo solicitada.", { flowVersionId });

  const stages = model.entities.processStages
    .filter((stage) => stage.flowVersionId === flowVersionId)
    .sort((a, b) => num(a.sequence) - num(b.sequence));
  ensure(stages.length > 0, "flow_without_stages", "La version de flujo no tiene etapas configuradas.", { flowVersionId });

  const periodHours = resolvePeriodHours(period);
  const byStage = stages.map((stage) => {
    const durationHours = resolveStageDurationHours(stage);
    return {
    stageId: stage.id,
    stageName: stage.name,
    capacityByRun: num(stage.capacityByRun),
    capacityUnitCode: stage.capacityUnitCode,
    period,
    periodHours,
    stageDurationHours: durationHours,
    availableRuns: durationHours > 0 ? round(periodHours / durationHours, 4) : 0,
    estimatedCapacity: durationHours > 0 ? round((num(stage.capacityByRun) * periodHours) / durationHours, 4) : 0,
    declaredMaxCapacity: num(stage.maxCapacityValue),
    declaredMaxCapacityUnitCode: stage.maxCapacityUnitCode || stage.capacityUnitCode,
    declaredMaxCapacityPeriod: stage.maxCapacityPeriod || "day",
    controlItems: stage.controlItems || [],
    requiredRecordNames: stage.requiredRecordNames || [],
    responsibleRoleNames: stage.responsibleRoleNames || [],
    operatorCount: num(stage.operatorCount),
    requiredAreaM2: num(stage.requiredAreaM2),
    };
  });

  const bottleneck = byStage.reduce((lowest, item) => {
    if (!lowest) return item;
    return item.estimatedCapacity < lowest.estimatedCapacity ? item : lowest;
  }, null);

  return {
    flowVersionId,
    period,
    byStage,
    bottleneck,
    estimatedFlowCapacity: bottleneck?.estimatedCapacity || 0,
  };
}

export function detectFlowBottleneck(data, { flowVersionId, period = "day" }) {
  const summary = calculateFlowCapacityByPeriod(data, { flowVersionId, period });
  return {
    flowVersionId,
    period,
    bottleneckStageId: summary.bottleneck?.stageId || "",
    bottleneckStageName: summary.bottleneck?.stageName || "",
    capacityUnitCode: summary.bottleneck?.capacityUnitCode || "",
    estimatedCapacity: summary.bottleneck?.estimatedCapacity || 0,
  };
}

export function explodeFormulaRequirements(data, { formulaId, plannedOutputQuantity = 0, plannedOutputUnitCode = "" }) {
  const model = migrateProcessPlanningPayload(data);
  const formula = model.entities.masterFormulas.find((item) => item.id === formulaId);
  if (!formula) {
    return { valid: false, issues: [{ level: "error", code: "formula_not_found", message: "No existe la formula solicitada." }], items: [] };
  }

  const ratio = num(formula.outputQuantity) > 0 ? num(plannedOutputQuantity) / num(formula.outputQuantity) : 0;
  const compatibleOutput = !plannedOutputUnitCode || validateCompatibleUnitPair(model, formula.outputUnitCode, plannedOutputUnitCode);
  const items = formula.items.map((item) => {
    const baseQuantity = num(item.quantity) * ratio;
    const grossQuantity = baseQuantity * (1 + num(item.scrapFactorPct) / 100);
    return {
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      materialType: item.materialType,
      stageId: item.stageId,
      netQuantity: round(baseQuantity, 4),
      grossQuantity: round(grossQuantity, 4),
      wasteAllowanceQuantity: round(grossQuantity - baseQuantity, 4),
      unitCode: item.unitCode,
    };
  });

  return {
    valid: compatibleOutput,
    issues: compatibleOutput ? [] : [{ level: "error", code: "formula_output_unit_incompatible", message: "La unidad solicitada no es compatible con la salida de la formula." }],
    items,
  };
}

export function buildWarehouseRequirementFromBatch(data, { batchId, areaPerUnit = 0, volumePerUnit = 0, positionsPerUnit = 0 }) {
  const model = migrateProcessPlanningPayload(data);
  const batch = model.entities.batches.find((item) => item.id === batchId);
  if (!batch) {
    return null;
  }

  const quantity = num(batch.plannedQuantity);
  return {
    batchId: batch.id,
    productId: batch.productId,
    warehouseZone: batch.targetWarehouseZone || "general",
    requiredAreaM2: round(quantity * num(areaPerUnit), 2),
    requiredVolumeM3: round(quantity * num(volumePerUnit), 2),
    requiredPositions: round(quantity * num(positionsPerUnit), 0),
  };
}

export function buildCalendarPlan(data, { lineId, startDate = "", endDate = "" }) {
  const model = migrateProcessPlanningPayload(data);
  const entries = model.entities.calendarEntries
    .filter((entry) => (!lineId || entry.lineId === lineId))
    .filter((entry) => {
      const current = dateOnly(entry.date);
      if (startDate && current < dateOnly(startDate)) return false;
      if (endDate && current > dateOnly(endDate)) return false;
      return true;
    })
    .sort((a, b) => dateOnly(a.date).localeCompare(dateOnly(b.date)));

  return entries.map((entry) => ({
    id: entry.id,
    lineId: entry.lineId,
    date: entry.date,
    shiftLabel: entry.shiftLabel,
    availableHours: num(entry.availableHours),
    availableAreaM2: num(entry.availableAreaM2),
    plannedBatchIds: entry.plannedBatchIds || [],
    plannedStageExecutionIds: entry.plannedStageExecutionIds || [],
  }));
}

export function planProductionBatch(data, { batchId }) {
  const model = migrateProcessPlanningPayload(data);
  const batch = model.entities.batches.find((item) => item.id === batchId);
  ensure(batch, "batch_not_found", "No existe el lote solicitado para planificacion.", { batchId });
  const flow = model.entities.flowVersions.find((item) => item.id === batch.flowVersionId);
  ensure(flow, "batch_flow_missing", "El lote no tiene una version de flujo valida.", { batchId, flowVersionId: batch.flowVersionId });

  const stages = model.entities.processStages
    .filter((stage) => stage.flowVersionId === flow.id)
    .sort((a, b) => num(a.sequence) - num(b.sequence));
  ensure(stages.length > 0, "flow_without_stages", "No se puede planificar un flujo sin etapas.", { flowVersionId: flow.id });

  const startDate = dateOnly(batch.plannedStartDate || batch.actualStartDate);
  ensure(startDate, "batch_start_date_required", "El lote debe tener fecha de inicio planificada.", { batchId });
  let cursor = new Date(`${startDate}T08:00:00`);

  const stagePlan = stages.map((stage) => {
    const startedAt = new Date(cursor);
    const durationHours = num(stage.durationHours) > 0 ? num(stage.durationHours) : num(stage.durationDays) * 24;
    const endedAt = new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000);
    cursor = new Date(endedAt);
    return {
      stageId: stage.id,
      stageName: stage.name,
      resourceIds: stage.defaultResourceIds || [],
      equipmentIds: stage.defaultEquipmentIds || [],
      requiredAreaM2: num(stage.requiredAreaM2),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationHours: round(durationHours, 2),
    };
  });

  const planStartDate = stagePlan[0]?.startedAt?.slice(0, 10) || startDate;
  const planEndDate = stagePlan[stagePlan.length - 1]?.endedAt?.slice(0, 10) || batch.plannedEndDate || startDate;
  const matchingCalendarEntries = model.entities.calendarEntries
    .filter((entry) => entry.lineId === batch.lineId)
    .filter((entry) => {
      const current = dateOnly(entry.date);
      return current >= planStartDate && current <= planEndDate;
    });
  const requiredHours = round(stagePlan.reduce((sum, item) => sum + num(item.durationHours), 0), 2);
  const availableHours = round(matchingCalendarEntries.reduce((sum, entry) => sum + num(entry.availableHours), 0), 2);
  const peakRequiredAreaM2 = round(stagePlan.reduce((max, item) => Math.max(max, num(item.requiredAreaM2)), 0), 2);
  const minimumAvailableAreaM2 = matchingCalendarEntries.length
    ? round(matchingCalendarEntries.reduce((min, entry) => Math.min(min, num(entry.availableAreaM2)), Number.POSITIVE_INFINITY), 2)
    : 0;
  const competingBatchIds = unique(
    matchingCalendarEntries.flatMap((entry) => (entry.plannedBatchIds || []).filter((plannedBatchId) => plannedBatchId !== batch.id)),
  );

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    lineId: batch.lineId,
    flowVersionId: flow.id,
    plannedStartDate: batch.plannedStartDate,
    plannedEndDate: planEndDate,
    stagePlan,
    calendarCheck: {
      lineId: batch.lineId,
      matchedEntryCount: matchingCalendarEntries.length,
      planStartDate,
      planEndDate,
      requiredHours,
      availableHours,
      sufficientHours: availableHours >= requiredHours,
      peakRequiredAreaM2,
      minimumAvailableAreaM2,
      sufficientArea: matchingCalendarEntries.length > 0 ? minimumAvailableAreaM2 >= peakRequiredAreaM2 : false,
      competingBatchIds,
    },
  };
}

export function calculateWarehouseNeeds(data, { batchId, areaPerUnit = 0, volumePerUnit = 0, positionsPerUnit = 0 }) {
  const requirement = buildWarehouseRequirementFromBatch(data, { batchId, areaPerUnit, volumePerUnit, positionsPerUnit });
  ensure(requirement, "warehouse_batch_not_found", "No existe el lote solicitado para calcular bodega.", { batchId });
  return requirement;
}

export function upsertWarehouseRequirement(data, input) {
  const model = migrateProcessPlanningPayload(data);
  const existing = model.entities.warehouseRequirements.find((item) => item.batchId === input.batchId && item.stageId === (input.stageId || ""));
  const payload = existing
    ? { ...existing, ...input }
    : createWarehouseRequirement(input);
  const items = model.entities.warehouseRequirements.filter((item) => item.id !== payload.id);
  items.push(payload);
  model.entities.warehouseRequirements = items;
  return model;
}

export function calculateMaterialRequirementsForBatch(data, { batchId, formulaId = "" }) {
  const model = migrateProcessPlanningPayload(data);
  const batch = model.entities.batches.find((item) => item.id === batchId);
  ensure(batch, "batch_not_found", "No existe el lote solicitado.", { batchId });
  const flow = model.entities.flowVersions.find((item) => item.id === batch.flowVersionId);
  const selectedFormulaId = formulaId || flow?.formulaId;
  ensure(selectedFormulaId, "formula_required", "El lote no tiene formula operativa asociada.", { batchId, flowVersionId: batch.flowVersionId });
  return explodeFormulaRequirements(model, {
    formulaId: selectedFormulaId,
    plannedOutputQuantity: batch.plannedQuantity,
    plannedOutputUnitCode: batch.plannedUnitCode,
  });
}

export class ProcessPlanningModuleService {
  constructor(repository) {
    this.repository = repository;
  }

  async load() {
    const payload = await this.repository.load();
    return migrateProcessPlanningPayload(payload);
  }

  async validate() {
    const payload = await this.load();
    return validateProcessPlanningData(payload);
  }

  async save(payload) {
    const result = validateProcessPlanningData(payload);
    if (!result.valid) {
      const message = result.issues
        .filter((issue) => issue.level === "error")
        .map((issue) => issue.message)
        .join(" ");
      throw new Error(message || "La informacion del modulo de procesos no es valida.");
    }
    return this.repository.save(result.data);
  }

  async list(entityName) {
    const data = await this.load();
    return clone(getCollection(data, entityName));
  }

  async getById(entityName, id) {
    const data = await this.load();
    const item = findById(getCollection(data, entityName), id);
    ensure(item, "entity_not_found", "No existe el registro solicitado.", { entityName, id });
    return clone(item);
  }

  async create(entityName, input) {
    const data = await this.load();
    const factory = ENTITY_FACTORIES[entityName];
    ensure(factory, "entity_not_creatable", `La entidad ${entityName} no admite alta.`, { entityName });
    const items = clone(getCollection(data, entityName));
    const created = factory(input);
    if ("code" in created) ensureUniqueField(items, "code", created.code);
    if (entityName === "batch") ensureUniqueField(items, "batchCode", created.batchCode);
    items.push(created);
    replaceCollection(data, entityName, items);
    await this.save(data);
    return created;
  }

  async update(entityName, id, patch) {
    const data = await this.load();
    const items = clone(getCollection(data, entityName));
    const current = findById(items, id);
    ensure(current, "entity_not_found", "No existe el registro a actualizar.", { entityName, id });
    const next = { ...current, ...patch, id: current.id };
    if ("code" in next) ensureUniqueField(items, "code", next.code, id);
    if (entityName === "batch") ensureUniqueField(items, "batchCode", next.batchCode, id);
    replaceCollection(
      data,
      entityName,
      items.map((item) => (item.id === id ? next : item)),
    );
    await this.save(data);
    return next;
  }

  async remove(entityName, id) {
    const data = await this.load();
    const items = clone(getCollection(data, entityName));
    const current = findById(items, id);
    ensure(current, "entity_not_found", "No existe el registro a eliminar.", { entityName, id });
    replaceCollection(
      data,
      entityName,
      items.filter((item) => item.id !== id),
    );
    await this.save(data);
    return { deleted: true, entityName, id };
  }

  async planBatch(batchId) {
    const data = await this.load();
    return planProductionBatch(data, { batchId });
  }

  async getBatchTraceability(batchId) {
    const data = await this.load();
    return calculateBatchTraceability(data, batchId);
  }

  async getWasteSummary(batchId) {
    const data = await this.load();
    return calculateFlowWasteSummary(data, batchId);
  }

  async getCapacityByFlow(flowVersionId, period = "day") {
    const data = await this.load();
    return calculateFlowCapacityByPeriod(data, { flowVersionId, period });
  }

  async getBottleneck(flowVersionId, period = "day") {
    const data = await this.load();
    return detectFlowBottleneck(data, { flowVersionId, period });
  }

  async getMaterialRequirements(batchId, formulaId = "") {
    const data = await this.load();
    return calculateMaterialRequirementsForBatch(data, { batchId, formulaId });
  }

  async getCalendar(lineId = "", startDate = "", endDate = "") {
    const data = await this.load();
    return buildCalendarPlan(data, { lineId, startDate, endDate });
  }

  async getWarehouseNeeds(batchId, params = {}) {
    const data = await this.load();
    return calculateWarehouseNeeds(data, { batchId, ...params });
  }

  async registerStageTraceability(batchId, executionInput) {
    const data = await this.load();
    const batch = data.entities.batches.find((item) => item.id === batchId);
    ensure(batch, "batch_not_found", "No existe el lote para registrar trazabilidad.", { batchId });
    const stage = data.entities.processStages.find((item) => item.id === executionInput.stageId);
    ensure(stage, "stage_not_found", "No existe la etapa para registrar trazabilidad.", { stageId: executionInput.stageId });
    ensure(stage.flowVersionId === batch.flowVersionId, "trace_stage_flow_mismatch", "La etapa no pertenece al flujo configurado en el lote.", {
      batchId,
      stageId: executionInput.stageId,
      batchFlowVersionId: batch.flowVersionId,
      stageFlowVersionId: stage.flowVersionId,
    });
    const existingExecutions = data.entities.stageExecutions
      .filter((item) => item.batchId === batchId)
      .sort((a, b) => num(a.sequence) - num(b.sequence));
    const duplicateSequence = existingExecutions.find((item) => num(item.sequence) === num(executionInput.sequence));
    ensure(!duplicateSequence, "trace_duplicate_sequence", "Ya existe una ejecucion para esa secuencia dentro del lote.", {
      batchId,
      sequence: executionInput.sequence,
    });
    const previousExecution = existingExecutions.find((item) => num(item.sequence) === num(executionInput.sequence) - 1);
    if (previousExecution) {
      ensure(previousExecution.outputLotCode === executionInput.inputLotCode, "trace_chain_broken_prev", "El lote de entrada no coincide con la salida de la etapa anterior.", {
        batchId,
        expectedInputLotCode: previousExecution.outputLotCode,
        receivedInputLotCode: executionInput.inputLotCode,
      });
    }
    const nextExecution = existingExecutions.find((item) => num(item.sequence) === num(executionInput.sequence) + 1);
    if (nextExecution) {
      ensure(nextExecution.inputLotCode === executionInput.outputLotCode, "trace_chain_broken_next", "El lote de salida no coincide con la entrada de la etapa siguiente ya registrada.", {
        batchId,
        expectedOutputLotCode: nextExecution.inputLotCode,
        receivedOutputLotCode: executionInput.outputLotCode,
      });
    }
    const execution = createStageExecution({
      batchId,
      ...executionInput,
    });
    const metrics = calculateStageExecutionMetrics(execution);
    execution.yieldPct = metrics.yieldPct;
    execution.durationHours = num(execution.durationHours) || 0;
    data.entities.stageExecutions.push(execution);
    await this.save(data);
    return execution;
  }
}
