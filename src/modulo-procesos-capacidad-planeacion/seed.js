import {
  createArea,
  createBatch,
  createCalendarEntry,
  createEquipment,
  createFormulaItem,
  createFlowVersion,
  createMasterFormula,
  createMaterial,
  createModuleData,
  createProcessStage,
  createProduct,
  createProductionLine,
  createResource,
  createStageExecution,
  createUnitConversion,
  createUnitDefinition,
  createWarehouseRequirement,
} from "./schema.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 2) {
  return Number(num(value).toFixed(decimals));
}

export function createBaseCatalogSeed() {
  const unitDefinitions = [
    createUnitDefinition({ code: "kg", name: "Kilogramo", symbol: "kg", dimension: "mass", baseUnitCode: "kg", toBaseFactor: 1, decimals: 3, isReference: true }),
    createUnitDefinition({ code: "g", name: "Gramo", symbol: "g", dimension: "mass", baseUnitCode: "kg", toBaseFactor: 0.001, decimals: 2 }),
    createUnitDefinition({ code: "lb", name: "Libra", symbol: "lb", dimension: "mass", baseUnitCode: "kg", toBaseFactor: 0.453592, decimals: 3 }),
    createUnitDefinition({ code: "l", name: "Litro", symbol: "L", dimension: "volume", baseUnitCode: "l", toBaseFactor: 1, decimals: 3, isReference: true }),
    createUnitDefinition({ code: "ml", name: "Mililitro", symbol: "mL", dimension: "volume", baseUnitCode: "l", toBaseFactor: 0.001, decimals: 2 }),
    createUnitDefinition({ code: "unit", name: "Unidad", symbol: "und", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0, isReference: true }),
    createUnitDefinition({ code: "box", name: "Caja", symbol: "cj", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0 }),
    createUnitDefinition({ code: "jar", name: "Frasco", symbol: "frasco", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0 }),
    createUnitDefinition({ code: "bag", name: "Bolsa", symbol: "bolsa", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0 }),
    createUnitDefinition({ code: "bottle", name: "Botella", symbol: "bot", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0 }),
    createUnitDefinition({ code: "tray", name: "Bandeja", symbol: "tray", dimension: "count", baseUnitCode: "unit", toBaseFactor: 1, decimals: 0 }),
    createUnitDefinition({ code: "qq", name: "Quintal", symbol: "qq", dimension: "mass", baseUnitCode: "kg", toBaseFactor: 45.3592, decimals: 3 }),
    createUnitDefinition({ code: "hour", name: "Hora", symbol: "h", dimension: "time", baseUnitCode: "hour", toBaseFactor: 1, decimals: 2, isReference: true }),
    createUnitDefinition({ code: "day", name: "Dia", symbol: "d", dimension: "time", baseUnitCode: "hour", toBaseFactor: 24, decimals: 2 }),
    createUnitDefinition({ code: "m2", name: "Metro cuadrado", symbol: "m2", dimension: "area", baseUnitCode: "m2", toBaseFactor: 1, decimals: 2, isReference: true }),
  ];

  const unitConversions = [
    createUnitConversion({ fromUnitCode: "g", toUnitCode: "kg", factor: 0.001 }),
    createUnitConversion({ fromUnitCode: "kg", toUnitCode: "g", factor: 1000 }),
    createUnitConversion({ fromUnitCode: "lb", toUnitCode: "kg", factor: 0.453592 }),
    createUnitConversion({ fromUnitCode: "kg", toUnitCode: "lb", factor: 2.20462 }),
    createUnitConversion({ fromUnitCode: "qq", toUnitCode: "kg", factor: 45.3592 }),
    createUnitConversion({ fromUnitCode: "kg", toUnitCode: "qq", factor: 1 / 45.3592 }),
    createUnitConversion({ fromUnitCode: "ml", toUnitCode: "l", factor: 0.001 }),
    createUnitConversion({ fromUnitCode: "l", toUnitCode: "ml", factor: 1000 }),
    createUnitConversion({ fromUnitCode: "day", toUnitCode: "hour", factor: 24 }),
    createUnitConversion({ fromUnitCode: "hour", toUnitCode: "day", factor: 1 / 24 }),
  ];

  return {
    unitDefinitions,
    unitConversions,
    stageTypes: ["preparation", "transformation", "inspection", "packaging", "storage", "dispatch"],
    materialTypes: ["raw_material", "packaging", "intermediate", "finished_good"],
    resourceModes: ["manual", "semi_automatic", "automatic"],
    batchStatuses: ["planned", "in_progress", "completed", "cancelled"],
  };
}

export function createStarterModuleSeed() {
  const data = createModuleData();
  const catalogs = createBaseCatalogSeed();
  data.catalogs = catalogs;

  const product = createProduct({
    code: "PRD-BASE",
    name: "Producto base",
    description: "Plantilla inicial para configurar un flujo productivo.",
    baseUnitCode: "kg",
  });

  const line = createProductionLine({
    code: "LINEA-01",
    name: "Linea principal",
    description: "Linea inicial de referencia.",
  });

  const area = createArea({
    code: "AREA-01",
    name: "Area de proceso principal",
    lineId: line.id,
    areaType: "production",
    capacityAreaM2: 25,
    capacityVolumeM3: 60,
  });

  const operatorResource = createResource({
    code: "RECURSO-OPERARIO",
    name: "Operario general",
    lineId: line.id,
    areaId: area.id,
    mode: "manual",
    capacityUnitCode: "hour",
    nominalCapacityPerDay: 8,
    nominalCapacityPerWeek: 48,
    nominalCapacityPerMonth: 192,
  });

  const mixer = createEquipment({
    code: "EQ-BASE",
    name: "Equipo base",
    lineId: line.id,
    areaId: area.id,
    supportedUnitCodes: ["kg"],
    capacityUnitCode: "kg",
    nominalCapacityPerHour: 25,
    nominalCapacityPerDay: 200,
    nominalCapacityPerWeek: 1200,
    nominalCapacityPerMonth: 4800,
  });

  const flow = createFlowVersion({
    productId: product.id,
    lineId: line.id,
    code: "FLUJO-BASE",
    name: "Flujo base",
    versionLabel: "v1",
    status: "draft",
    durationMode: "same_day",
    sourceReferenceLabel: "Referencia tipo PO1",
  });

  const prepStage = createProcessStage({
    flowVersionId: flow.id,
    lineId: line.id,
    sequence: 1,
    code: "ET-10",
    name: "Preparacion",
    stageType: "preparation",
    capacityByRun: 100,
    capacityUnitCode: "kg",
    maxCapacityValue: 800,
    maxCapacityUnitCode: "kg",
    maxCapacityPeriod: "day",
    operatorCount: 2,
    responsibleRoleNames: ["Jefe de Planta"],
    controlItems: ["Peso", "Inspeccion fisica"],
    requiredRecordNames: ["Registro de ingreso"],
    machineMaterialRefs: ["Balanza", "Tanque de preparacion"],
    toolingNotes: "Operacion base de preparacion.",
    requiredAreaM2: 12,
    requiredAreaHeightM: 3,
    defaultResourceIds: [operatorResource.id],
    defaultEquipmentIds: [mixer.id],
  });

  const packStage = createProcessStage({
    flowVersionId: flow.id,
    lineId: line.id,
    sequence: 2,
    code: "ET-20",
    name: "Empaque",
    stageType: "packaging",
    inputUnitCode: "kg",
    outputUnitCode: "unit",
    wasteUnitCode: "kg",
    capacityByRun: 500,
    capacityUnitCode: "unit",
    maxCapacityValue: 4000,
    maxCapacityUnitCode: "unit",
    maxCapacityPeriod: "day",
    operatorCount: 2,
    responsibleRoleNames: ["Operario de Empaque"],
    controlItems: ["Peso", "Etiquetado", "Integridad del envase"],
    requiredRecordNames: ["Registro de empaque", "Registro de lote"],
    machineMaterialRefs: ["Mesa de empaque", "Selladora", "Etiquetas"],
    toolingNotes: "Incluye materiales de empaque y herramientas ligeras.",
    requiredAreaM2: 10,
    requiredAreaHeightM: 3,
    storageConditionNotes: "Mantener producto protegido y seco.",
    defaultResourceIds: [operatorResource.id],
  });

  const rawMaterial = createMaterial({
    code: "MAT-BASE",
    name: "Materia prima base",
    materialType: "raw_material",
    baseUnitCode: "kg",
  });

  const packageMaterial = createMaterial({
    code: "ENV-BASE",
    name: "Envase base",
    materialType: "packaging",
    baseUnitCode: "unit",
  });

  const formula = createMasterFormula({
    productId: product.id,
    flowVersionId: flow.id,
    code: "FMO-BASE",
    versionLabel: "v1",
    outputQuantity: 100,
    outputUnitCode: "kg",
    items: [
      {
        id: "fitem_raw_base",
        materialId: rawMaterial.id,
        materialCode: rawMaterial.code,
        materialName: rawMaterial.name,
        materialType: rawMaterial.materialType,
        quantity: 100,
        unitCode: "kg",
        stageId: prepStage.id,
        scrapFactorPct: 2,
        notes: "Consumo base para arranque.",
      },
      {
        id: "fitem_pack_base",
        materialId: packageMaterial.id,
        materialCode: packageMaterial.code,
        materialName: packageMaterial.name,
        materialType: packageMaterial.materialType,
        quantity: 100,
        unitCode: "unit",
        stageId: packStage.id,
        scrapFactorPct: 1,
        notes: "Un envase por unidad final.",
      },
    ],
  });

  flow.formulaId = formula.id;
  flow.stageIds = [prepStage.id, packStage.id];
  line.areaIds = [area.id];
  line.resourceIds = [operatorResource.id];
  line.equipmentIds = [mixer.id];

  data.entities.products.push(product);
  data.entities.productionLines.push(line);
  data.entities.areas.push(area);
  data.entities.resources.push(operatorResource);
  data.entities.equipments.push(mixer);
  data.entities.flowVersions.push(flow);
  data.entities.processStages.push(prepStage, packStage);
  data.entities.materials.push(rawMaterial, packageMaterial);
  data.entities.masterFormulas.push(formula);

  data.entities.batches.push(
    createBatch({
      batchCode: "LOTE-BASE-001",
      productId: product.id,
      flowVersionId: flow.id,
      lineId: line.id,
      plannedQuantity: 100,
      plannedUnitCode: "kg",
      plannedStartDate: "2026-05-01",
      plannedEndDate: "2026-05-01",
      targetWarehouseZone: "terminado",
      upstreamSupplierName: "Proveedor base",
      upstreamSourceCode: "SRC-BASE-001",
    }),
  );

  data.entities.calendarEntries.push(
    createCalendarEntry({
      lineId: line.id,
      date: "2026-05-01",
      shiftLabel: "general",
      availableHours: 8,
      availableAreaM2: 20,
    }),
  );

  data.entities.warehouseRequirements.push(
    createWarehouseRequirement({
      productId: product.id,
      warehouseZone: "terminado",
      requiredAreaM2: 2,
      requiredVolumeM3: 1.2,
      requiredPositions: 4,
      coverageDays: 7,
      notes: "Plantilla inicial de almacenamiento.",
    }),
  );

  return data;
}

function addRangeCalendarEntries(data, lineId, startDate, days, shiftLabel, availableHours, availableAreaM2, batchIds = []) {
  const cursor = new Date(`${startDate}T00:00:00`);
  for (let index = 0; index < days; index += 1) {
    const date = cursor.toISOString().slice(0, 10);
    data.entities.calendarEntries.push(createCalendarEntry({
      lineId,
      date,
      shiftLabel,
      availableHours,
      availableAreaM2,
      plannedBatchIds: batchIds,
      notes: "Calendario demo del módulo.",
    }));
    cursor.setDate(cursor.getDate() + 1);
  }
}

function createScenarioContext(data, { familyCode, familyName, productName, description, baseUnitCode, line, area, resource, equipment, flowCode, versionLabel, durationMode, sourceReferenceLabel, batchCode, plannedQuantity, plannedUnitCode, plannedStartDate, plannedEndDate, warehouseZone, supplierName, sourceCode }) {
  const product = createProduct({
    code: familyCode,
    name: productName,
    description,
    baseUnitCode,
    shelfLifeDays: 180,
    lotPolicy: "manual",
    storageProfileId: warehouseZone,
  });

  const flow = createFlowVersion({
    productId: product.id,
    lineId: line.id,
    code: flowCode,
    name: `${familyName} · Flujo operativo`,
    versionLabel,
    status: "active",
    durationMode,
    sourceReferenceLabel,
  });

  const batch = createBatch({
    batchCode,
    productId: product.id,
    flowVersionId: flow.id,
    lineId: line.id,
    plannedQuantity,
    plannedUnitCode,
    plannedStartDate,
    plannedEndDate,
    status: "planned",
    targetWarehouseZone: warehouseZone,
    upstreamSupplierName: supplierName,
    upstreamSourceCode: sourceCode,
    notes: `Lote ejemplo para ${familyName}.`,
  });

  data.entities.products.push(product);
  data.entities.batches.push(batch);
  data.entities.flowVersions.push(flow);

  return {
    product,
    flow,
    batch,
    line,
    area,
    resource,
    equipment,
  };
}

function addScenarioFormula(data, { product, flow, code, versionLabel, outputQuantity, outputUnitCode, items }) {
  const formula = createMasterFormula({
    productId: product.id,
    flowVersionId: flow.id,
    code,
    versionLabel,
    outputQuantity,
    outputUnitCode,
    items: items.map((item) => createFormulaItem(item)),
  });
  flow.formulaId = formula.id;
  data.entities.masterFormulas.push(formula);
  return formula;
}

function addScenarioStages(data, flow, stages) {
  const created = stages.map((item) => createProcessStage({ ...item, flowVersionId: flow.id, lineId: flow.lineId }));
  flow.stageIds = created.map((item) => item.id);
  data.entities.processStages.push(...created);
  return created;
}

function addScenarioExecutions(data, batch, stageExecutions) {
  const created = stageExecutions.map((item) => {
    const inputQuantity = num(item.inputQuantity);
    const outputQuantity = num(item.outputQuantity);
    const yieldPct = inputQuantity > 0 ? round((outputQuantity / inputQuantity) * 100, 2) : 0;
    return createStageExecution({
      ...item,
      batchId: batch.id,
      yieldPct,
    });
  });
  data.entities.stageExecutions.push(...created);
  return created;
}

function addMaterials(data, materials) {
  const created = materials.map((item) => createMaterial(item));
  data.entities.materials.push(...created);
  return created;
}

export function createFunctionalExampleSeed() {
  const data = createModuleData();
  data.catalogs = createBaseCatalogSeed();
  data.metadata.moduleName = "Modulo de Procesos, Capacidad y Planeacion · Demo funcional";

  const lines = {
    agroWet: createProductionLine({ code: "LINEA-AGRO-WET", name: "Línea agro húmeda", description: "Procesos húmedos y fermentativos." }),
    thermalDry: createProductionLine({ code: "LINEA-THERMAL", name: "Línea térmica y secado", description: "Tueste, deshidratado y estabilización." }),
    extraction: createProductionLine({ code: "LINEA-EXTRACT", name: "Línea de extracción", description: "Destilación y concentración." }),
    cosmetics: createProductionLine({ code: "LINEA-COS", name: "Línea cosmética", description: "Mezcla, emulsión y acondicionado." }),
    sharedPack: createProductionLine({ code: "LINEA-PACK", name: "Línea compartida de empaque", description: "Empaque final compartido para varias familias." }),
  };

  const areas = {
    wetPrep: createArea({ code: "AREA-WET-01", name: "Recepción y lavado", lineId: lines.agroWet.id, areaType: "production", capacityAreaM2: 35, capacityVolumeM3: 100 }),
    ferment: createArea({ code: "AREA-WET-02", name: "Fermentación y reposo", lineId: lines.agroWet.id, areaType: "production", capacityAreaM2: 40, capacityVolumeM3: 120 }),
    thermalOps: createArea({ code: "AREA-TH-01", name: "Secado y tratamiento térmico", lineId: lines.thermalDry.id, areaType: "production", capacityAreaM2: 48, capacityVolumeM3: 140 }),
    extractOps: createArea({ code: "AREA-EX-01", name: "Extracción y destilación", lineId: lines.extraction.id, areaType: "production", capacityAreaM2: 28, capacityVolumeM3: 85 }),
    cosmeticMix: createArea({ code: "AREA-COS-01", name: "Preparación cosmética", lineId: lines.cosmetics.id, areaType: "production", capacityAreaM2: 24, capacityVolumeM3: 70 }),
    sharedPack: createArea({ code: "AREA-PACK-01", name: "Acondicionamiento y empaque final", lineId: lines.sharedPack.id, areaType: "production", capacityAreaM2: 30, capacityVolumeM3: 75 }),
    sharedWarehouse: createArea({ code: "AREA-BOD-01", name: "Bodega terminados", lineId: lines.sharedPack.id, areaType: "storage", capacityAreaM2: 60, capacityVolumeM3: 180 }),
  };

  const resources = {
    plantLead: createResource({ code: "RES-PLANTA", name: "Jefe de planta", lineId: lines.agroWet.id, areaId: areas.wetPrep.id, mode: "manual", capacityUnitCode: "hour", nominalCapacityPerDay: 8, nominalCapacityPerWeek: 48, nominalCapacityPerMonth: 192 }),
    wetOps: createResource({ code: "RES-WET", name: "Operarios húmedos", lineId: lines.agroWet.id, areaId: areas.wetPrep.id, mode: "manual", capacityUnitCode: "hour", nominalCapacityPerDay: 24, nominalCapacityPerWeek: 144, nominalCapacityPerMonth: 576 }),
    thermalOps: createResource({ code: "RES-THERMAL", name: "Operarios térmicos", lineId: lines.thermalDry.id, areaId: areas.thermalOps.id, mode: "semi_automatic", capacityUnitCode: "hour", nominalCapacityPerDay: 16, nominalCapacityPerWeek: 96, nominalCapacityPerMonth: 384 }),
    extractOps: createResource({ code: "RES-EXTRACT", name: "Operarios extracción", lineId: lines.extraction.id, areaId: areas.extractOps.id, mode: "semi_automatic", capacityUnitCode: "hour", nominalCapacityPerDay: 12, nominalCapacityPerWeek: 72, nominalCapacityPerMonth: 288 }),
    cosmeticOps: createResource({ code: "RES-COS", name: "Operarios cosmética", lineId: lines.cosmetics.id, areaId: areas.cosmeticMix.id, mode: "manual", capacityUnitCode: "hour", nominalCapacityPerDay: 12, nominalCapacityPerWeek: 72, nominalCapacityPerMonth: 288 }),
    sharedPackingCrew: createResource({ code: "RES-PACK", name: "Equipo de empaque compartido", lineId: lines.sharedPack.id, areaId: areas.sharedPack.id, mode: "manual", capacityUnitCode: "hour", nominalCapacityPerDay: 16, nominalCapacityPerWeek: 96, nominalCapacityPerMonth: 384 }),
  };

  const equipments = {
    washer: createEquipment({ code: "EQ-WASH", name: "Lavadora y escurrido", lineId: lines.agroWet.id, areaId: areas.wetPrep.id, capacityUnitCode: "kg", nominalCapacityPerHour: 180, nominalCapacityPerDay: 1440, nominalCapacityPerWeek: 8640, nominalCapacityPerMonth: 34560, supportedUnitCodes: ["kg", "qq"] }),
    fermenters: createEquipment({ code: "EQ-FERMENT", name: "Tanques de fermentación", lineId: lines.agroWet.id, areaId: areas.ferment.id, capacityUnitCode: "kg", nominalCapacityPerHour: 75, nominalCapacityPerDay: 600, nominalCapacityPerWeek: 3600, nominalCapacityPerMonth: 14400, supportedUnitCodes: ["kg", "qq"] }),
    dryer: createEquipment({ code: "EQ-DRY", name: "Secador industrial", lineId: lines.thermalDry.id, areaId: areas.thermalOps.id, capacityUnitCode: "kg", nominalCapacityPerHour: 60, nominalCapacityPerDay: 480, nominalCapacityPerWeek: 2880, nominalCapacityPerMonth: 11520, supportedUnitCodes: ["kg", "qq"] }),
    roaster: createEquipment({ code: "EQ-ROAST", name: "Tostadora por lotes", lineId: lines.thermalDry.id, areaId: areas.thermalOps.id, capacityUnitCode: "kg", nominalCapacityPerHour: 48, nominalCapacityPerDay: 384, nominalCapacityPerWeek: 2304, nominalCapacityPerMonth: 9216, supportedUnitCodes: ["kg", "qq"] }),
    still: createEquipment({ code: "EQ-STILL", name: "Destilador de arrastre", lineId: lines.extraction.id, areaId: areas.extractOps.id, capacityUnitCode: "kg", nominalCapacityPerHour: 40, nominalCapacityPerDay: 320, nominalCapacityPerWeek: 1920, nominalCapacityPerMonth: 7680, supportedUnitCodes: ["kg", "l"] }),
    mixer: createEquipment({ code: "EQ-MIX", name: "Mezclador cosmético", lineId: lines.cosmetics.id, areaId: areas.cosmeticMix.id, capacityUnitCode: "kg", nominalCapacityPerHour: 55, nominalCapacityPerDay: 440, nominalCapacityPerWeek: 2640, nominalCapacityPerMonth: 10560, supportedUnitCodes: ["kg", "l"] }),
    filler: createEquipment({ code: "EQ-FILL", name: "Llenadora y loteadora", lineId: lines.sharedPack.id, areaId: areas.sharedPack.id, capacityUnitCode: "unit", nominalCapacityPerHour: 320, nominalCapacityPerDay: 2560, nominalCapacityPerWeek: 15360, nominalCapacityPerMonth: 61440, supportedUnitCodes: ["unit", "jar", "bag", "bottle", "tray"] }),
  };

  Object.values(lines).forEach((line) => data.entities.productionLines.push(line));
  Object.values(areas).forEach((area) => data.entities.areas.push(area));
  Object.values(resources).forEach((resource) => data.entities.resources.push(resource));
  Object.values(equipments).forEach((equipment) => data.entities.equipments.push(equipment));

  lines.agroWet.areaIds = [areas.wetPrep.id, areas.ferment.id];
  lines.thermalDry.areaIds = [areas.thermalOps.id];
  lines.extraction.areaIds = [areas.extractOps.id];
  lines.cosmetics.areaIds = [areas.cosmeticMix.id];
  lines.sharedPack.areaIds = [areas.sharedPack.id, areas.sharedWarehouse.id];

  lines.agroWet.resourceIds = [resources.plantLead.id, resources.wetOps.id];
  lines.thermalDry.resourceIds = [resources.thermalOps.id];
  lines.extraction.resourceIds = [resources.extractOps.id];
  lines.cosmetics.resourceIds = [resources.cosmeticOps.id];
  lines.sharedPack.resourceIds = [resources.sharedPackingCrew.id];

  lines.agroWet.equipmentIds = [equipments.washer.id, equipments.fermenters.id];
  lines.thermalDry.equipmentIds = [equipments.dryer.id, equipments.roaster.id];
  lines.extraction.equipmentIds = [equipments.still.id];
  lines.cosmetics.equipmentIds = [equipments.mixer.id];
  lines.sharedPack.equipmentIds = [equipments.filler.id];

  const cacaoMaterials = addMaterials(data, [
    { code: "MAT-CACAO-BABA", name: "Cacao en baba", materialType: "raw_material", baseUnitCode: "kg" },
    { code: "MAT-SACO-YUTE", name: "Saco de yute", materialType: "packaging", baseUnitCode: "bag" },
  ]);
  const cafeMaterials = addMaterials(data, [
    { code: "MAT-CAFE-PERG", name: "Café pergamino", materialType: "raw_material", baseUnitCode: "qq" },
    { code: "ENV-BOLSA-250", name: "Bolsa 250 g", materialType: "packaging", baseUnitCode: "bag" },
  ]);
  const oilMaterials = addMaterials(data, [
    { code: "MAT-HOJA-ESENCIAL", name: "Hoja aromática fresca", materialType: "raw_material", baseUnitCode: "kg" },
    { code: "ENV-BOT-30", name: "Botella ámbar 30 ml", materialType: "packaging", baseUnitCode: "bottle" },
  ]);
  const creamMaterials = addMaterials(data, [
    { code: "MAT-BASE-CREMA", name: "Base emulsionante", materialType: "raw_material", baseUnitCode: "kg" },
    { code: "MAT-ACTIVO-BOT", name: "Activo botánico", materialType: "raw_material", baseUnitCode: "kg" },
    { code: "ENV-FRASCO-100", name: "Frasco cosmético 100 ml", materialType: "packaging", baseUnitCode: "jar" },
  ]);
  const dehydratedMaterials = addMaterials(data, [
    { code: "MAT-FRUTA-FRESCA", name: "Fruta fresca troceada", materialType: "raw_material", baseUnitCode: "kg" },
    { code: "ENV-BOLSA-SEC", name: "Bolsa doypack", materialType: "packaging", baseUnitCode: "bag" },
  ]);

  const cacaoCtx = createScenarioContext(data, {
    familyCode: "PRD-CACAO-NIBS",
    familyName: "Cacao",
    productName: "Cacao seco fermentado",
    description: "Ejemplo agroindustrial con proceso de varios días y secado prolongado.",
    baseUnitCode: "kg",
    line: lines.agroWet,
    area: areas.ferment,
    resource: resources.wetOps,
    equipment: equipments.fermenters,
    flowCode: "FLUJO-CACAO",
    versionLabel: "v1",
    durationMode: "multi_day",
    sourceReferenceLabel: "Referencia funcional cacao",
    batchCode: "LOT-CACAO-001",
    plannedQuantity: 450,
    plannedUnitCode: "kg",
    plannedStartDate: "2026-06-02",
    plannedEndDate: "2026-06-08",
    warehouseZone: "bodega-cacao",
    supplierName: "Red de proveedores cacao",
    sourceCode: "SRC-CACAO-001",
  });
  const cacaoStages = addScenarioStages(data, cacaoCtx.flow, [
    {
      sequence: 1, code: "CAC-10", name: "Recepción y pesado", stageType: "preparation",
      inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 1.5, durationDays: 1,
      capacityByRun: 500, capacityUnitCode: "kg", maxCapacityValue: 1000, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day",
      operatorCount: 2, responsibleRoleNames: ["Jefe de Planta"], controlItems: ["Peso", "Revisión visual", "Fecha cosecha"],
      requiredRecordNames: ["Registro de ingreso"], machineMaterialRefs: ["Balanza", "Tinas"], requiredAreaM2: 18,
      defaultResourceIds: [resources.plantLead.id, resources.wetOps.id], defaultEquipmentIds: [equipments.washer.id],
    },
    {
      sequence: 2, code: "CAC-20", name: "Fermentación controlada", stageType: "transformation",
      inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 0, durationDays: 5,
      capacityByRun: 450, capacityUnitCode: "kg", maxCapacityValue: 600, maxCapacityUnitCode: "kg", maxCapacityPeriod: "week",
      operatorCount: 1, responsibleRoleNames: ["Operario húmedo"], controlItems: ["Temperatura", "Volteo", "pH"],
      requiredRecordNames: ["Registro de fermentación"], machineMaterialRefs: ["Cajones fermentación"], requiredAreaM2: 24,
      defaultResourceIds: [resources.wetOps.id], defaultEquipmentIds: [equipments.fermenters.id],
    },
    {
      sequence: 3, code: "CAC-30", name: "Secado final", stageType: "transformation",
      inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 0, durationDays: 3,
      capacityByRun: 250, capacityUnitCode: "kg", maxCapacityValue: 320, maxCapacityUnitCode: "kg", maxCapacityPeriod: "week",
      operatorCount: 2, responsibleRoleNames: ["Operario térmico"], controlItems: ["Humedad", "Temperatura", "Color"],
      requiredRecordNames: ["Registro de secado"], machineMaterialRefs: ["Secador industrial"], requiredAreaM2: 26,
      defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.dryer.id],
    },
    {
      sequence: 4, code: "CAC-40", name: "Empaque y lotización", stageType: "packaging",
      inputUnitCode: "kg", outputUnitCode: "bag", wasteUnitCode: "kg", durationHours: 2, durationDays: 1,
      capacityByRun: 180, capacityUnitCode: "bag", maxCapacityValue: 800, maxCapacityUnitCode: "bag", maxCapacityPeriod: "day",
      operatorCount: 2, responsibleRoleNames: ["Equipo de empaque compartido"], controlItems: ["Peso neto", "Lote", "Sellado"],
      requiredRecordNames: ["Registro de empaque"], machineMaterialRefs: ["Selladora", "Loteadora", "Sacos"], requiredAreaM2: 10,
      defaultResourceIds: [resources.sharedPackingCrew.id], defaultEquipmentIds: [equipments.filler.id],
    },
  ]);
  addScenarioFormula(data, {
    product: cacaoCtx.product,
    flow: cacaoCtx.flow,
    code: "FMO-CACAO",
    versionLabel: "v1",
    outputQuantity: 360,
    outputUnitCode: "kg",
    items: [
      { materialId: cacaoMaterials[0].id, materialCode: cacaoMaterials[0].code, materialName: cacaoMaterials[0].name, materialType: cacaoMaterials[0].materialType, quantity: 500, unitCode: "kg", stageId: cacaoStages[0].id, scrapFactorPct: 10, notes: "Pérdida por fermentación y secado." },
      { materialId: cacaoMaterials[1].id, materialCode: cacaoMaterials[1].code, materialName: cacaoMaterials[1].name, materialType: cacaoMaterials[1].materialType, quantity: 18, unitCode: "bag", stageId: cacaoStages[3].id, scrapFactorPct: 2, notes: "Un saco por 20 kg secos." },
    ],
  });
  addScenarioExecutions(data, cacaoCtx.batch, [
    { stageId: cacaoStages[0].id, sequence: 1, inputLotCode: "CAC-RAW-001", outputLotCode: "CAC-PREP-001", inputQuantity: 500, inputUnitCode: "kg", outputQuantity: 490, outputUnitCode: "kg", wasteQuantity: 10, wasteUnitCode: "kg", durationHours: 1.5, startedAt: "2026-06-02T08:00:00.000Z", endedAt: "2026-06-02T09:30:00.000Z", resourceIds: [resources.plantLead.id], equipmentIds: [equipments.washer.id], traceLinks: [{ id: "trace_cacao_1", inputLotCode: "CAC-RAW-001", outputLotCode: "CAC-PREP-001", quantity: 500, unitCode: "kg" }] },
    { stageId: cacaoStages[1].id, sequence: 2, inputLotCode: "CAC-PREP-001", outputLotCode: "CAC-FER-001", inputQuantity: 490, inputUnitCode: "kg", outputQuantity: 430, outputUnitCode: "kg", wasteQuantity: 60, wasteUnitCode: "kg", durationHours: 120, startedAt: "2026-06-02T10:00:00.000Z", endedAt: "2026-06-07T10:00:00.000Z", resourceIds: [resources.wetOps.id], equipmentIds: [equipments.fermenters.id], traceLinks: [{ id: "trace_cacao_2", inputLotCode: "CAC-PREP-001", outputLotCode: "CAC-FER-001", quantity: 490, unitCode: "kg" }] },
    { stageId: cacaoStages[2].id, sequence: 3, inputLotCode: "CAC-FER-001", outputLotCode: "CAC-SEC-001", inputQuantity: 430, inputUnitCode: "kg", outputQuantity: 360, outputUnitCode: "kg", wasteQuantity: 70, wasteUnitCode: "kg", durationHours: 72, startedAt: "2026-06-07T11:00:00.000Z", endedAt: "2026-06-10T11:00:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.dryer.id], traceLinks: [{ id: "trace_cacao_3", inputLotCode: "CAC-FER-001", outputLotCode: "CAC-SEC-001", quantity: 430, unitCode: "kg" }] },
    { stageId: cacaoStages[3].id, sequence: 4, inputLotCode: "CAC-SEC-001", outputLotCode: "CAC-FIN-001", inputQuantity: 360, inputUnitCode: "kg", outputQuantity: 18, outputUnitCode: "bag", wasteQuantity: 3, wasteUnitCode: "kg", durationHours: 2, startedAt: "2026-06-10T13:00:00.000Z", endedAt: "2026-06-10T15:00:00.000Z", resourceIds: [resources.sharedPackingCrew.id], equipmentIds: [equipments.filler.id], traceLinks: [{ id: "trace_cacao_4", inputLotCode: "CAC-SEC-001", outputLotCode: "CAC-FIN-001", quantity: 360, unitCode: "kg" }] },
  ]);
  addRangeCalendarEntries(data, lines.agroWet.id, "2026-06-02", 6, "agro-dia", 8, 28, [cacaoCtx.batch.id]);
  data.entities.warehouseRequirements.push(createWarehouseRequirement({ batchId: cacaoCtx.batch.id, productId: cacaoCtx.product.id, warehouseZone: "bodega-cacao", requiredAreaM2: 14, requiredVolumeM3: 9, requiredPositions: 18, coverageDays: 20, notes: "Requiere aireación y pallets." }));

  const cafeCtx = createScenarioContext(data, {
    familyCode: "PRD-CAFE-TOSTADO",
    familyName: "Café",
    productName: "Café tostado molido 250 g",
    description: "Ejemplo con recepción, tueste, estabilización y empaque fino.",
    baseUnitCode: "bag",
    line: lines.thermalDry,
    area: areas.thermalOps,
    resource: resources.thermalOps,
    equipment: equipments.roaster,
    flowCode: "FLUJO-CAFE",
    versionLabel: "v2",
    durationMode: "same_day",
    sourceReferenceLabel: "Referencia funcional café",
    batchCode: "LOT-CAFE-001",
    plannedQuantity: 640,
    plannedUnitCode: "bag",
    plannedStartDate: "2026-06-04",
    plannedEndDate: "2026-06-04",
    warehouseZone: "bodega-cafe",
    supplierName: "Acopio pergamino",
    sourceCode: "SRC-CAFE-001",
  });
  const cafeStages = addScenarioStages(data, cafeCtx.flow, [
    { sequence: 1, code: "CAF-10", name: "Selección de lote", stageType: "preparation", inputUnitCode: "qq", outputUnitCode: "qq", wasteUnitCode: "kg", durationHours: 1, durationDays: 1, capacityByRun: 12, capacityUnitCode: "qq", maxCapacityValue: 12, maxCapacityUnitCode: "qq", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Jefe de Planta"], controlItems: ["Edad", "Humedad"], requiredRecordNames: ["Registro de salida de bodega"], machineMaterialRefs: ["Balanza", "Medidor de humedad"], requiredAreaM2: 14, defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.roaster.id] },
    { sequence: 2, code: "CAF-20", name: "Tueste", stageType: "transformation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 6, durationDays: 1, capacityByRun: 240, capacityUnitCode: "kg", maxCapacityValue: 288, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Tostador"], controlItems: ["Curva de tueste", "Color"], requiredRecordNames: ["Registro de tueste"], machineMaterialRefs: ["Tostadora"], requiredAreaM2: 12, defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.roaster.id] },
    { sequence: 3, code: "CAF-30", name: "Reposo y estabilización", stageType: "inspection", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 12, durationDays: 1, capacityByRun: 220, capacityUnitCode: "kg", maxCapacityValue: 220, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Jefe de Calidad"], controlItems: ["Degasificación", "Aroma"], requiredRecordNames: ["Registro de reposo"], machineMaterialRefs: ["Tolvas de reposo"], requiredAreaM2: 10, defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.roaster.id] },
    { sequence: 4, code: "CAF-40", name: "Empaque 250 g", stageType: "packaging", inputUnitCode: "kg", outputUnitCode: "bag", wasteUnitCode: "kg", durationHours: 4, durationDays: 1, capacityByRun: 640, capacityUnitCode: "bag", maxCapacityValue: 1280, maxCapacityUnitCode: "bag", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Equipo de empaque compartido"], controlItems: ["Peso", "Sellado", "Lote"], requiredRecordNames: ["Registro de empaque"], machineMaterialRefs: ["Llenadora", "Bolsas 250 g"], requiredAreaM2: 10, defaultResourceIds: [resources.sharedPackingCrew.id], defaultEquipmentIds: [equipments.filler.id] },
  ]);
  addScenarioFormula(data, {
    product: cafeCtx.product,
    flow: cafeCtx.flow,
    code: "FMO-CAFE",
    versionLabel: "v2",
    outputQuantity: 640,
    outputUnitCode: "bag",
    items: [
      { materialId: cafeMaterials[0].id, materialCode: cafeMaterials[0].code, materialName: cafeMaterials[0].name, materialType: cafeMaterials[0].materialType, quantity: 4.2, unitCode: "qq", stageId: cafeStages[0].id, scrapFactorPct: 6, notes: "Pérdida por selección y tueste." },
      { materialId: cafeMaterials[1].id, materialCode: cafeMaterials[1].code, materialName: cafeMaterials[1].name, materialType: cafeMaterials[1].materialType, quantity: 640, unitCode: "bag", stageId: cafeStages[3].id, scrapFactorPct: 1, notes: "Una bolsa por empaque final." },
    ],
  });
  addScenarioExecutions(data, cafeCtx.batch, [
    { stageId: cafeStages[0].id, sequence: 1, inputLotCode: "CAF-PERG-001", outputLotCode: "CAF-SEL-001", inputQuantity: 4.2, inputUnitCode: "qq", outputQuantity: 4.1, outputUnitCode: "qq", wasteQuantity: 2, wasteUnitCode: "kg", durationHours: 1, startedAt: "2026-06-04T08:00:00.000Z", endedAt: "2026-06-04T09:00:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.roaster.id], traceLinks: [{ id: "trace_cafe_1", inputLotCode: "CAF-PERG-001", outputLotCode: "CAF-SEL-001", quantity: 4.2, unitCode: "qq" }] },
    { stageId: cafeStages[1].id, sequence: 2, inputLotCode: "CAF-SEL-001", outputLotCode: "CAF-ROAST-001", inputQuantity: 186, inputUnitCode: "kg", outputQuantity: 171, outputUnitCode: "kg", wasteQuantity: 15, wasteUnitCode: "kg", durationHours: 6, startedAt: "2026-06-04T09:30:00.000Z", endedAt: "2026-06-04T15:30:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.roaster.id], traceLinks: [{ id: "trace_cafe_2", inputLotCode: "CAF-SEL-001", outputLotCode: "CAF-ROAST-001", quantity: 186, unitCode: "kg" }] },
    { stageId: cafeStages[2].id, sequence: 3, inputLotCode: "CAF-ROAST-001", outputLotCode: "CAF-REST-001", inputQuantity: 171, inputUnitCode: "kg", outputQuantity: 168, outputUnitCode: "kg", wasteQuantity: 3, wasteUnitCode: "kg", durationHours: 12, startedAt: "2026-06-04T16:00:00.000Z", endedAt: "2026-06-05T04:00:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.roaster.id], traceLinks: [{ id: "trace_cafe_3", inputLotCode: "CAF-ROAST-001", outputLotCode: "CAF-REST-001", quantity: 171, unitCode: "kg" }] },
    { stageId: cafeStages[3].id, sequence: 4, inputLotCode: "CAF-REST-001", outputLotCode: "CAF-FIN-001", inputQuantity: 168, inputUnitCode: "kg", outputQuantity: 640, outputUnitCode: "bag", wasteQuantity: 1.5, wasteUnitCode: "kg", durationHours: 4, startedAt: "2026-06-05T08:00:00.000Z", endedAt: "2026-06-05T12:00:00.000Z", resourceIds: [resources.sharedPackingCrew.id], equipmentIds: [equipments.filler.id], traceLinks: [{ id: "trace_cafe_4", inputLotCode: "CAF-REST-001", outputLotCode: "CAF-FIN-001", quantity: 168, unitCode: "kg" }] },
  ]);
  addRangeCalendarEntries(data, lines.thermalDry.id, "2026-06-04", 2, "tostado", 8, 20, [cafeCtx.batch.id]);
  addRangeCalendarEntries(data, lines.sharedPack.id, "2026-06-05", 1, "empaque-compartido", 8, 18, [cafeCtx.batch.id]);
  data.entities.warehouseRequirements.push(createWarehouseRequirement({ batchId: cafeCtx.batch.id, productId: cafeCtx.product.id, warehouseZone: "bodega-cafe", requiredAreaM2: 8, requiredVolumeM3: 4.8, requiredPositions: 10, coverageDays: 15, notes: "Producto listo para despacho minorista." }));

  const oilCtx = createScenarioContext(data, {
    familyCode: "PRD-ACEITE-ESENCIAL",
    familyName: "Aceite esencial",
    productName: "Aceite esencial 30 ml",
    description: "Ejemplo de extracción con rendimiento muy bajo y fuerte conversión masa-volumen operativa.",
    baseUnitCode: "bottle",
    line: lines.extraction,
    area: areas.extractOps,
    resource: resources.extractOps,
    equipment: equipments.still,
    flowCode: "FLUJO-OIL",
    versionLabel: "v1",
    durationMode: "same_day",
    sourceReferenceLabel: "Referencia funcional extracción",
    batchCode: "LOT-OIL-001",
    plannedQuantity: 180,
    plannedUnitCode: "bottle",
    plannedStartDate: "2026-06-06",
    plannedEndDate: "2026-06-06",
    warehouseZone: "bodega-aromas",
    supplierName: "Cultivo aromático interno",
    sourceCode: "SRC-OIL-001",
  });
  const oilStages = addScenarioStages(data, oilCtx.flow, [
    { sequence: 1, code: "OIL-10", name: "Picado de biomasa", stageType: "preparation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 2, durationDays: 1, capacityByRun: 120, capacityUnitCode: "kg", maxCapacityValue: 360, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Operario extracción"], controlItems: ["Humedad", "Tamaño de corte"], requiredRecordNames: ["Registro de preparación"], machineMaterialRefs: ["Mesa inox", "Cuchillas"], requiredAreaM2: 10, defaultResourceIds: [resources.extractOps.id], defaultEquipmentIds: [equipments.still.id] },
    { sequence: 2, code: "OIL-20", name: "Destilación", stageType: "transformation", inputUnitCode: "kg", outputUnitCode: "l", wasteUnitCode: "kg", durationHours: 6, durationDays: 1, capacityByRun: 12, capacityUnitCode: "l", maxCapacityValue: 16, maxCapacityUnitCode: "l", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Destilador"], controlItems: ["Tiempo", "Temperatura", "Separación de fases"], requiredRecordNames: ["Registro de destilación"], machineMaterialRefs: ["Destilador", "Condensador"], requiredAreaM2: 16, defaultResourceIds: [resources.extractOps.id], defaultEquipmentIds: [equipments.still.id] },
    { sequence: 3, code: "OIL-30", name: "Acondicionamiento final", stageType: "packaging", inputUnitCode: "l", outputUnitCode: "bottle", wasteUnitCode: "ml", durationHours: 3, durationDays: 1, capacityByRun: 180, capacityUnitCode: "bottle", maxCapacityValue: 240, maxCapacityUnitCode: "bottle", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Equipo de empaque compartido"], controlItems: ["Volumen", "Transparencia", "Lote"], requiredRecordNames: ["Registro de envasado"], machineMaterialRefs: ["Botellas 30 ml", "Tapas", "Etiquetas"], requiredAreaM2: 8, defaultResourceIds: [resources.sharedPackingCrew.id], defaultEquipmentIds: [equipments.filler.id] },
  ]);
  addScenarioFormula(data, {
    product: oilCtx.product,
    flow: oilCtx.flow,
    code: "FMO-OIL",
    versionLabel: "v1",
    outputQuantity: 180,
    outputUnitCode: "bottle",
    items: [
      { materialId: oilMaterials[0].id, materialCode: oilMaterials[0].code, materialName: oilMaterials[0].name, materialType: oilMaterials[0].materialType, quantity: 150, unitCode: "kg", stageId: oilStages[0].id, scrapFactorPct: 8, notes: "Biomasa fresca con rendimiento bajo." },
      { materialId: oilMaterials[1].id, materialCode: oilMaterials[1].code, materialName: oilMaterials[1].name, materialType: oilMaterials[1].materialType, quantity: 180, unitCode: "bottle", stageId: oilStages[2].id, scrapFactorPct: 2, notes: "Botella por unidad final." },
    ],
  });
  addScenarioExecutions(data, oilCtx.batch, [
    { stageId: oilStages[0].id, sequence: 1, inputLotCode: "BIO-001", outputLotCode: "BIO-PREP-001", inputQuantity: 150, inputUnitCode: "kg", outputQuantity: 145, outputUnitCode: "kg", wasteQuantity: 5, wasteUnitCode: "kg", durationHours: 2, startedAt: "2026-06-06T08:00:00.000Z", endedAt: "2026-06-06T10:00:00.000Z", resourceIds: [resources.extractOps.id], equipmentIds: [equipments.still.id], traceLinks: [{ id: "trace_oil_1", inputLotCode: "BIO-001", outputLotCode: "BIO-PREP-001", quantity: 150, unitCode: "kg" }] },
    { stageId: oilStages[1].id, sequence: 2, inputLotCode: "BIO-PREP-001", outputLotCode: "OIL-BULK-001", inputQuantity: 145, inputUnitCode: "kg", outputQuantity: 6, outputUnitCode: "l", wasteQuantity: 133, wasteUnitCode: "kg", durationHours: 6, startedAt: "2026-06-06T10:30:00.000Z", endedAt: "2026-06-06T16:30:00.000Z", resourceIds: [resources.extractOps.id], equipmentIds: [equipments.still.id], traceLinks: [{ id: "trace_oil_2", inputLotCode: "BIO-PREP-001", outputLotCode: "OIL-BULK-001", quantity: 145, unitCode: "kg" }] },
    { stageId: oilStages[2].id, sequence: 3, inputLotCode: "OIL-BULK-001", outputLotCode: "OIL-FIN-001", inputQuantity: 6, inputUnitCode: "l", outputQuantity: 180, outputUnitCode: "bottle", wasteQuantity: 0.12, wasteUnitCode: "ml", durationHours: 3, startedAt: "2026-06-06T17:00:00.000Z", endedAt: "2026-06-06T20:00:00.000Z", resourceIds: [resources.sharedPackingCrew.id], equipmentIds: [equipments.filler.id], traceLinks: [{ id: "trace_oil_3", inputLotCode: "OIL-BULK-001", outputLotCode: "OIL-FIN-001", quantity: 6, unitCode: "l" }] },
  ]);
  addRangeCalendarEntries(data, lines.extraction.id, "2026-06-06", 1, "destilacion", 10, 18, [oilCtx.batch.id]);
  addRangeCalendarEntries(data, lines.sharedPack.id, "2026-06-06", 1, "empaque-compartido", 6, 12, [oilCtx.batch.id]);
  data.entities.warehouseRequirements.push(createWarehouseRequirement({ batchId: oilCtx.batch.id, productId: oilCtx.product.id, warehouseZone: "bodega-aromas", requiredAreaM2: 3, requiredVolumeM3: 1.5, requiredPositions: 6, coverageDays: 30, notes: "Botellas ámbar en racks cerrados." }));

  const creamCtx = createScenarioContext(data, {
    familyCode: "PRD-CREMA-COS",
    familyName: "Crema cosmética",
    productName: "Crema botánica 100 ml",
    description: "Ejemplo cosmético con mezcla/emulsión y empaque compartido.",
    baseUnitCode: "jar",
    line: lines.cosmetics,
    area: areas.cosmeticMix,
    resource: resources.cosmeticOps,
    equipment: equipments.mixer,
    flowCode: "FLUJO-CREMA",
    versionLabel: "v3",
    durationMode: "same_day",
    sourceReferenceLabel: "Referencia funcional cosmética",
    batchCode: "LOT-CREMA-001",
    plannedQuantity: 900,
    plannedUnitCode: "jar",
    plannedStartDate: "2026-06-07",
    plannedEndDate: "2026-06-07",
    warehouseZone: "bodega-cosmetica",
    supplierName: "Laboratorio base",
    sourceCode: "SRC-CREMA-001",
  });
  const creamStages = addScenarioStages(data, creamCtx.flow, [
    { sequence: 1, code: "CRE-10", name: "Pesado y preparación", stageType: "preparation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 1.5, durationDays: 1, capacityByRun: 120, capacityUnitCode: "kg", maxCapacityValue: 360, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Formulador"], controlItems: ["Pesaje", "Limpieza"], requiredRecordNames: ["Registro de preparación"], machineMaterialRefs: ["Balanzas", "Mesas inox"], requiredAreaM2: 8, defaultResourceIds: [resources.cosmeticOps.id], defaultEquipmentIds: [equipments.mixer.id] },
    { sequence: 2, code: "CRE-20", name: "Emulsión y homogenización", stageType: "transformation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 4, durationDays: 1, capacityByRun: 100, capacityUnitCode: "kg", maxCapacityValue: 200, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Jefe de calidad"], controlItems: ["Temperatura", "pH", "Viscosidad"], requiredRecordNames: ["Registro de lote cosmético"], machineMaterialRefs: ["Mezclador", "Homogeneizador"], requiredAreaM2: 12, defaultResourceIds: [resources.cosmeticOps.id], defaultEquipmentIds: [equipments.mixer.id] },
    { sequence: 3, code: "CRE-30", name: "Llenado y etiquetado", stageType: "packaging", inputUnitCode: "kg", outputUnitCode: "jar", wasteUnitCode: "kg", durationHours: 4.5, durationDays: 1, capacityByRun: 900, capacityUnitCode: "jar", maxCapacityValue: 1200, maxCapacityUnitCode: "jar", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Equipo de empaque compartido"], controlItems: ["Peso neto", "Cierre", "Lote"], requiredRecordNames: ["Registro de envasado"], machineMaterialRefs: ["Frascos 100 ml", "Etiquetas"], requiredAreaM2: 10, defaultResourceIds: [resources.sharedPackingCrew.id], defaultEquipmentIds: [equipments.filler.id] },
  ]);
  addScenarioFormula(data, {
    product: creamCtx.product,
    flow: creamCtx.flow,
    code: "FMO-CREMA",
    versionLabel: "v3",
    outputQuantity: 900,
    outputUnitCode: "jar",
    items: [
      { materialId: creamMaterials[0].id, materialCode: creamMaterials[0].code, materialName: creamMaterials[0].name, materialType: creamMaterials[0].materialType, quantity: 72, unitCode: "kg", stageId: creamStages[0].id, scrapFactorPct: 2, notes: "Base principal de formulación." },
      { materialId: creamMaterials[1].id, materialCode: creamMaterials[1].code, materialName: creamMaterials[1].name, materialType: creamMaterials[1].materialType, quantity: 8, unitCode: "kg", stageId: creamStages[1].id, scrapFactorPct: 1, notes: "Activo botánico." },
      { materialId: creamMaterials[2].id, materialCode: creamMaterials[2].code, materialName: creamMaterials[2].name, materialType: creamMaterials[2].materialType, quantity: 900, unitCode: "jar", stageId: creamStages[2].id, scrapFactorPct: 1, notes: "Un frasco por unidad final." },
    ],
  });
  addScenarioExecutions(data, creamCtx.batch, [
    { stageId: creamStages[0].id, sequence: 1, inputLotCode: "COS-BASE-001", outputLotCode: "COS-PREP-001", inputQuantity: 82, inputUnitCode: "kg", outputQuantity: 80.5, outputUnitCode: "kg", wasteQuantity: 1.5, wasteUnitCode: "kg", durationHours: 1.5, startedAt: "2026-06-07T08:00:00.000Z", endedAt: "2026-06-07T09:30:00.000Z", resourceIds: [resources.cosmeticOps.id], equipmentIds: [equipments.mixer.id], traceLinks: [{ id: "trace_cream_1", inputLotCode: "COS-BASE-001", outputLotCode: "COS-PREP-001", quantity: 82, unitCode: "kg" }] },
    { stageId: creamStages[1].id, sequence: 2, inputLotCode: "COS-PREP-001", outputLotCode: "COS-MIX-001", inputQuantity: 80.5, inputUnitCode: "kg", outputQuantity: 78.5, outputUnitCode: "kg", wasteQuantity: 2, wasteUnitCode: "kg", durationHours: 4, startedAt: "2026-06-07T10:00:00.000Z", endedAt: "2026-06-07T14:00:00.000Z", resourceIds: [resources.cosmeticOps.id], equipmentIds: [equipments.mixer.id], traceLinks: [{ id: "trace_cream_2", inputLotCode: "COS-PREP-001", outputLotCode: "COS-MIX-001", quantity: 80.5, unitCode: "kg" }] },
    { stageId: creamStages[2].id, sequence: 3, inputLotCode: "COS-MIX-001", outputLotCode: "COS-FIN-001", inputQuantity: 78.5, inputUnitCode: "kg", outputQuantity: 900, outputUnitCode: "jar", wasteQuantity: 0.8, wasteUnitCode: "kg", durationHours: 4.5, startedAt: "2026-06-07T14:30:00.000Z", endedAt: "2026-06-07T19:00:00.000Z", resourceIds: [resources.sharedPackingCrew.id], equipmentIds: [equipments.filler.id], traceLinks: [{ id: "trace_cream_3", inputLotCode: "COS-MIX-001", outputLotCode: "COS-FIN-001", quantity: 78.5, unitCode: "kg" }] },
  ]);
  addRangeCalendarEntries(data, lines.cosmetics.id, "2026-06-07", 1, "cosmetica", 10, 16, [creamCtx.batch.id]);
  addRangeCalendarEntries(data, lines.sharedPack.id, "2026-06-07", 1, "empaque-compartido", 8, 18, [creamCtx.batch.id]);
  data.entities.warehouseRequirements.push(createWarehouseRequirement({ batchId: creamCtx.batch.id, productId: creamCtx.product.id, warehouseZone: "bodega-cosmetica", requiredAreaM2: 6, requiredVolumeM3: 2.8, requiredPositions: 12, coverageDays: 25, notes: "Control de temperatura estable." }));

  const dehydratedCtx = createScenarioContext(data, {
    familyCode: "PRD-FRUTA-SEC",
    familyName: "Producto deshidratado",
    productName: "Fruta deshidratada en doypack",
    description: "Ejemplo de secado de varios días con cuello de botella térmico.",
    baseUnitCode: "bag",
    line: lines.thermalDry,
    area: areas.thermalOps,
    resource: resources.thermalOps,
    equipment: equipments.dryer,
    flowCode: "FLUJO-SECADO",
    versionLabel: "v1",
    durationMode: "multi_day",
    sourceReferenceLabel: "Referencia funcional deshidratado",
    batchCode: "LOT-SEC-001",
    plannedQuantity: 420,
    plannedUnitCode: "bag",
    plannedStartDate: "2026-06-08",
    plannedEndDate: "2026-06-10",
    warehouseZone: "bodega-secos",
    supplierName: "Productores de fruta fresca",
    sourceCode: "SRC-SEC-001",
  });
  const dehydratedStages = addScenarioStages(data, dehydratedCtx.flow, [
    { sequence: 1, code: "SEC-10", name: "Selección y corte", stageType: "preparation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 3, durationDays: 1, capacityByRun: 180, capacityUnitCode: "kg", maxCapacityValue: 360, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 3, responsibleRoleNames: ["Supervisor de proceso"], controlItems: ["Madurez", "Corte uniforme"], requiredRecordNames: ["Registro de preparación"], machineMaterialRefs: ["Mesas", "Cuchillos"], requiredAreaM2: 16, defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.dryer.id] },
    { sequence: 2, code: "SEC-20", name: "Deshidratado", stageType: "transformation", inputUnitCode: "kg", outputUnitCode: "kg", wasteUnitCode: "kg", durationHours: 20, durationDays: 2, capacityByRun: 90, capacityUnitCode: "kg", maxCapacityValue: 120, maxCapacityUnitCode: "kg", maxCapacityPeriod: "day", operatorCount: 1, responsibleRoleNames: ["Operario térmico"], controlItems: ["Temperatura", "Humedad residual"], requiredRecordNames: ["Registro de secado"], machineMaterialRefs: ["Secador"], requiredAreaM2: 20, defaultResourceIds: [resources.thermalOps.id], defaultEquipmentIds: [equipments.dryer.id] },
    { sequence: 3, code: "SEC-30", name: "Empaque final", stageType: "packaging", inputUnitCode: "kg", outputUnitCode: "bag", wasteUnitCode: "kg", durationHours: 2.5, durationDays: 1, capacityByRun: 420, capacityUnitCode: "bag", maxCapacityValue: 900, maxCapacityUnitCode: "bag", maxCapacityPeriod: "day", operatorCount: 2, responsibleRoleNames: ["Equipo de empaque compartido"], controlItems: ["Peso", "Sellado", "Oxígeno residual"], requiredRecordNames: ["Registro de empaque"], machineMaterialRefs: ["Doypack", "Selladora"], requiredAreaM2: 10, defaultResourceIds: [resources.sharedPackingCrew.id], defaultEquipmentIds: [equipments.filler.id] },
  ]);
  addScenarioFormula(data, {
    product: dehydratedCtx.product,
    flow: dehydratedCtx.flow,
    code: "FMO-SECADO",
    versionLabel: "v1",
    outputQuantity: 420,
    outputUnitCode: "bag",
    items: [
      { materialId: dehydratedMaterials[0].id, materialCode: dehydratedMaterials[0].code, materialName: dehydratedMaterials[0].name, materialType: dehydratedMaterials[0].materialType, quantity: 210, unitCode: "kg", stageId: dehydratedStages[0].id, scrapFactorPct: 12, notes: "Merma alta por agua evaporada." },
      { materialId: dehydratedMaterials[1].id, materialCode: dehydratedMaterials[1].code, materialName: dehydratedMaterials[1].name, materialType: dehydratedMaterials[1].materialType, quantity: 420, unitCode: "bag", stageId: dehydratedStages[2].id, scrapFactorPct: 1, notes: "Una bolsa por empaque." },
    ],
  });
  addScenarioExecutions(data, dehydratedCtx.batch, [
    { stageId: dehydratedStages[0].id, sequence: 1, inputLotCode: "FRUTA-001", outputLotCode: "FRUTA-CUT-001", inputQuantity: 210, inputUnitCode: "kg", outputQuantity: 198, outputUnitCode: "kg", wasteQuantity: 12, wasteUnitCode: "kg", durationHours: 3, startedAt: "2026-06-08T08:00:00.000Z", endedAt: "2026-06-08T11:00:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.dryer.id], traceLinks: [{ id: "trace_sec_1", inputLotCode: "FRUTA-001", outputLotCode: "FRUTA-CUT-001", quantity: 210, unitCode: "kg" }] },
    { stageId: dehydratedStages[1].id, sequence: 2, inputLotCode: "FRUTA-CUT-001", outputLotCode: "FRUTA-DRY-001", inputQuantity: 198, inputUnitCode: "kg", outputQuantity: 84, outputUnitCode: "kg", wasteQuantity: 114, wasteUnitCode: "kg", durationHours: 20, startedAt: "2026-06-08T12:00:00.000Z", endedAt: "2026-06-09T08:00:00.000Z", resourceIds: [resources.thermalOps.id], equipmentIds: [equipments.dryer.id], traceLinks: [{ id: "trace_sec_2", inputLotCode: "FRUTA-CUT-001", outputLotCode: "FRUTA-DRY-001", quantity: 198, unitCode: "kg" }] },
    { stageId: dehydratedStages[2].id, sequence: 3, inputLotCode: "FRUTA-DRY-001", outputLotCode: "FRUTA-FIN-001", inputQuantity: 84, inputUnitCode: "kg", outputQuantity: 420, outputUnitCode: "bag", wasteQuantity: 0.9, wasteUnitCode: "kg", durationHours: 2.5, startedAt: "2026-06-09T09:00:00.000Z", endedAt: "2026-06-09T11:30:00.000Z", resourceIds: [resources.sharedPackingCrew.id], equipmentIds: [equipments.filler.id], traceLinks: [{ id: "trace_sec_3", inputLotCode: "FRUTA-DRY-001", outputLotCode: "FRUTA-FIN-001", quantity: 84, unitCode: "kg" }] },
  ]);
  addRangeCalendarEntries(data, lines.thermalDry.id, "2026-06-08", 2, "secado", 10, 22, [dehydratedCtx.batch.id]);
  addRangeCalendarEntries(data, lines.sharedPack.id, "2026-06-09", 1, "empaque-compartido", 8, 18, [dehydratedCtx.batch.id]);
  data.entities.warehouseRequirements.push(createWarehouseRequirement({ batchId: dehydratedCtx.batch.id, productId: dehydratedCtx.product.id, warehouseZone: "bodega-secos", requiredAreaM2: 5, requiredVolumeM3: 2.2, requiredPositions: 9, coverageDays: 30, notes: "Producto seco con baja humedad." }));

  return data;
}
