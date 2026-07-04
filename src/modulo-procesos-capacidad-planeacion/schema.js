export const PROCESS_PLANNING_SCHEMA_VERSION = "2026-05-01";

/**
 * @typedef {"mass"|"volume"|"count"|"time"|"area"} UnitDimension
 * @typedef {"draft"|"active"|"archived"} FlowVersionStatus
 * @typedef {"planned"|"in_progress"|"completed"|"cancelled"} BatchStatus
 * @typedef {"raw_material"|"packaging"|"intermediate"|"finished_good"} MaterialType
 * @typedef {"manual"|"semi_automatic"|"automatic"} ResourceMode
 * @typedef {"preparation"|"transformation"|"inspection"|"packaging"|"storage"|"dispatch"} StageType
 */

function buildId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createUnitDefinition(overrides = {}) {
  return {
    id: buildId("unit"),
    code: "",
    name: "",
    symbol: "",
    dimension: "count",
    baseUnitCode: "",
    toBaseFactor: 1,
    decimals: 2,
    isReference: false,
    ...overrides,
  };
}

export function createUnitConversion(overrides = {}) {
  return {
    id: buildId("conv"),
    fromUnitCode: "",
    toUnitCode: "",
    factor: 1,
    roundingDecimals: 4,
    ...overrides,
  };
}

export function createProduct(overrides = {}) {
  return {
    id: buildId("prd"),
    code: "",
    name: "",
    description: "",
    baseUnitCode: "kg",
    shelfLifeDays: 0,
    lotPolicy: "manual",
    storageProfileId: "",
    active: true,
    ...overrides,
  };
}

export function createProductionLine(overrides = {}) {
  return {
    id: buildId("line"),
    code: "",
    name: "",
    description: "",
    areaIds: [],
    resourceIds: [],
    equipmentIds: [],
    active: true,
    ...overrides,
  };
}

export function createArea(overrides = {}) {
  return {
    id: buildId("area"),
    code: "",
    name: "",
    lineId: "",
    areaType: "production",
    capacityAreaM2: 0,
    capacityVolumeM3: 0,
    notes: "",
    active: true,
    ...overrides,
  };
}

export function createFlowVersion(overrides = {}) {
  return {
    id: buildId("flow"),
    productId: "",
    lineId: "",
    code: "",
    versionLabel: "v1",
    name: "",
    status: "draft",
    durationMode: "same_day",
    formulaId: "",
    stageIds: [],
    sourceReferenceLabel: "",
    notes: "",
    ...overrides,
  };
}

export function createProcessStage(overrides = {}) {
  return {
    id: buildId("stage"),
    flowVersionId: "",
    lineId: "",
    sequence: 1,
    code: "",
    name: "",
    stageType: "transformation",
    inputUnitCode: "kg",
    outputUnitCode: "kg",
    wasteUnitCode: "kg",
    durationHours: 1,
    durationDays: 1,
    capacityByRun: 0,
    capacityUnitCode: "kg",
    maxCapacityValue: 0,
    maxCapacityUnitCode: "",
    maxCapacityPeriod: "day",
    operatorCount: 0,
    responsibleRoleNames: [],
    controlItems: [],
    requiredRecordNames: [],
    machineMaterialRefs: [],
    toolingNotes: "",
    requiredAreaM2: 0,
    requiredAreaHeightM: 0,
    storageConditionNotes: "",
    changeoverMinutes: 0,
    defaultResourceIds: [],
    defaultEquipmentIds: [],
    requiresLotTraceability: true,
    notes: "",
    ...overrides,
  };
}

export function createResource(overrides = {}) {
  return {
    id: buildId("res"),
    code: "",
    name: "",
    mode: "manual",
    lineId: "",
    areaId: "",
    capacityUnitCode: "hour",
    nominalCapacityPerDay: 0,
    nominalCapacityPerWeek: 0,
    nominalCapacityPerMonth: 0,
    active: true,
    ...overrides,
  };
}

export function createEquipment(overrides = {}) {
  return {
    id: buildId("eq"),
    code: "",
    name: "",
    lineId: "",
    areaId: "",
    supportedUnitCodes: ["kg"],
    capacityUnitCode: "kg",
    nominalCapacityPerHour: 0,
    nominalCapacityPerDay: 0,
    nominalCapacityPerWeek: 0,
    nominalCapacityPerMonth: 0,
    setupMinutes: 0,
    active: true,
    ...overrides,
  };
}

export function createMaterial(overrides = {}) {
  return {
    id: buildId("mat"),
    code: "",
    name: "",
    materialType: "raw_material",
    baseUnitCode: "kg",
    active: true,
    ...overrides,
  };
}

export function createFormulaItem(overrides = {}) {
  return {
    id: buildId("fitem"),
    materialId: "",
    materialCode: "",
    materialName: "",
    materialType: "raw_material",
    quantity: 0,
    unitCode: "kg",
    stageId: "",
    scrapFactorPct: 0,
    notes: "",
    ...overrides,
  };
}

export function createMasterFormula(overrides = {}) {
  return {
    id: buildId("formula"),
    productId: "",
    flowVersionId: "",
    code: "",
    versionLabel: "v1",
    outputQuantity: 1,
    outputUnitCode: "kg",
    items: [],
    notes: "",
    ...overrides,
  };
}

export function createBatch(overrides = {}) {
  return {
    id: buildId("batch"),
    batchCode: "",
    productId: "",
    flowVersionId: "",
    lineId: "",
    plannedQuantity: 0,
    plannedUnitCode: "kg",
    plannedStartDate: "",
    plannedEndDate: "",
    actualStartDate: "",
    actualEndDate: "",
    status: "planned",
    priority: "normal",
    targetWarehouseZone: "general",
    upstreamSupplierName: "",
    upstreamSourceCode: "",
    notes: "",
    ...overrides,
  };
}

export function createLotLink(overrides = {}) {
  return {
    id: buildId("trace"),
    inputLotCode: "",
    outputLotCode: "",
    quantity: 0,
    unitCode: "kg",
    ...overrides,
  };
}

export function createStageExecution(overrides = {}) {
  return {
    id: buildId("exec"),
    batchId: "",
    stageId: "",
    sequence: 1,
    startedAt: "",
    endedAt: "",
    inputLotCode: "",
    outputLotCode: "",
    inputQuantity: 0,
    inputUnitCode: "kg",
    outputQuantity: 0,
    outputUnitCode: "kg",
    wasteQuantity: 0,
    wasteUnitCode: "kg",
    yieldPct: 0,
    durationHours: 0,
    resourceIds: [],
    equipmentIds: [],
    traceLinks: [],
    notes: "",
    ...overrides,
  };
}

export function createCalendarEntry(overrides = {}) {
  return {
    id: buildId("cal"),
    lineId: "",
    date: "",
    shiftLabel: "general",
    availableHours: 0,
    availableAreaM2: 0,
    plannedBatchIds: [],
    plannedStageExecutionIds: [],
    notes: "",
    ...overrides,
  };
}

export function createWarehouseRequirement(overrides = {}) {
  return {
    id: buildId("wh"),
    batchId: "",
    productId: "",
    stageId: "",
    materialId: "",
    lotCode: "",
    warehouseZone: "general",
    requiredAreaM2: 0,
    requiredVolumeM3: 0,
    requiredPositions: 0,
    coverageDays: 0,
    notes: "",
    ...overrides,
  };
}

export function createModuleData(overrides = {}) {
  return {
    schemaVersion: PROCESS_PLANNING_SCHEMA_VERSION,
    metadata: {
      moduleCode: "MOD-PROCESOS-CAPACIDAD-PLANEACION",
      moduleName: "Modulo de Procesos, Capacidad y Planeacion",
      vendor: "Jungle Lab S.A.S.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    catalogs: {
      unitDefinitions: [],
      unitConversions: [],
      stageTypes: [],
      materialTypes: [],
      resourceModes: [],
      batchStatuses: [],
    },
    entities: {
      products: [],
      productionLines: [],
      areas: [],
      flowVersions: [],
      processStages: [],
      resources: [],
      equipments: [],
      materials: [],
      masterFormulas: [],
      batches: [],
      stageExecutions: [],
      calendarEntries: [],
      warehouseRequirements: [],
    },
    integration: {
      costs: {
        enabled: false,
        mode: "export_only",
        lastPublishedAt: "",
      },
    },
    ...overrides,
  };
}
