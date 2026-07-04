import {
  calculateBatchTraceability,
  calculateFlowWasteSummary,
  explodeFormulaRequirements,
} from "./services.js";
import { migrateProcessPlanningPayload } from "./migrations.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 4) {
  return Number(num(value).toFixed(decimals));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function groupBy(items = [], keySelector) {
  return items.reduce((acc, item) => {
    const key = keySelector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function titleCaseWord(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeCostUnitLabel(unitCode = "") {
  const value = String(unitCode || "").trim().toLowerCase();
  const map = {
    kg: "Kg",
    g: "g",
    lb: "Lb",
    l: "Litro",
    lt: "Litro",
    litro: "Litro",
    litros: "Litro",
    ml: "mL",
    unidad: "Unidad",
    unidades: "Unidad",
    und: "Unidad",
    unit: "Unidad",
    units: "Unidad",
    bottle: "Botella",
    bottles: "Botella",
    botella: "Botella",
    botellas: "Botella",
    frasco: "Frasco",
    frascos: "Frasco",
    jar: "Frasco",
    jars: "Frasco",
    bag: "Bolsa",
    bags: "Bolsa",
    bolsa: "Bolsa",
    bolsas: "Bolsa",
    funda: "Funda",
    fundas: "Funda",
    pouch: "Funda",
    pouches: "Funda",
    pote: "Pote",
    potes: "Pote",
    pot: "Pote",
    pots: "Pote",
    lote: "Lote",
    lot: "Lote",
    qq: "Kg",
    hour: "Hora",
    hours: "Hora",
    hora: "Hora",
    horas: "Hora",
  };
  return map[value] || titleCaseWord(String(unitCode || ""));
}

function directAccountForMaterialType(materialType = "") {
  if (materialType === "packaging") return "Empaque directo";
  if (materialType === "intermediate") return "Ingrediente";
  return "Materia prima";
}

function buildComparableProcessSummary(batch, wasteSummary, traceability = []) {
  if (wasteSummary?.aggregateMode === "comparable_totals" && wasteSummary.comparableUnitCode) {
    return {
      inputQty: num(wasteSummary.totalInput),
      usefulQty: num(wasteSummary.totalUseful),
      wasteQty: num(wasteSummary.totalWaste),
      unitCode: wasteSummary.comparableUnitCode,
      yieldPct: num(wasteSummary.totalYieldPct),
      wastePct: num(wasteSummary.totalWastePct),
    };
  }

  const firstTrace = traceability[0];
  const lastTrace = traceability[traceability.length - 1];
  const stageSummaries = wasteSummary?.stageSummaries || [];
  const firstStage = stageSummaries[0];
  const lastStage = stageSummaries[stageSummaries.length - 1];

  const inputQty = num(firstStage?.inputQuantity);
  const usefulQty = num(lastStage?.outputQuantity || batch?.plannedQuantity);
  const wasteQty = Math.max(0, inputQty - usefulQty);
  const unitCode = firstStage?.inputUnitCode || lastStage?.outputUnitCode || batch?.plannedUnitCode || "";
  const yieldPct = inputQty > 0 ? round((usefulQty / inputQty) * 100, 2) : 0;
  const wastePct = inputQty > 0 ? round((wasteQty / inputQty) * 100, 2) : 0;

  return {
    inputQty,
    usefulQty,
    wasteQty,
    unitCode,
    yieldPct,
    wastePct,
    inputLotCode: firstTrace?.inputLotCode || "",
    outputLotCode: lastTrace?.outputLotCode || "",
  };
}

function buildMaterialRows(formulaRequirements) {
  return formulaRequirements.items.map((item) => ({
    account: directAccountForMaterialType(item.materialType),
    description: item.materialName || item.materialCode || "Material desde procesos",
    unit: normalizeCostUnitLabel(item.unitCode),
    qty: round(item.grossQuantity, 4),
    unitCost: 0,
    behavior: "Variable",
    materialId: item.materialId,
    materialCode: item.materialCode,
    source: "formula_operativa",
    stageId: item.stageId || "",
    note: item.scrapFactorPct > 0
      ? `Incluye tolerancia operativa y merma de formula. Completar valor unitario.`
      : "Completar valor unitario en Costos.",
  }));
}

function buildLaborRows(stages = [], executionByStage = {}) {
  return stages
    .filter((stage) => num(stage.operatorCount) > 0)
    .map((stage) => {
      const actualHours = executionByStage[stage.id]?.durationHours;
      const durationHours = num(actualHours) > 0 ? num(actualHours) : num(stage.durationHours || num(stage.durationDays) * 24);
      return {
        account: "Mano de obra directa",
        description: `Mano de obra directa - ${stage.name}`,
        unit: "Hora",
        qty: round(num(stage.operatorCount) * durationHours, 4),
        unitCost: 0,
        behavior: "Variable",
        stageId: stage.id,
        operatorCount: num(stage.operatorCount),
        roleNames: stage.responsibleRoleNames || [],
        note: "Completar tarifa por hora del personal operativo.",
      };
    })
    .filter((item) => item.qty > 0);
}

function buildIndirectDriverRows(stages = [], executionByStage = {}) {
  const cleaningHours = round(
    stages.reduce((sum, stage) => sum + (num(stage.changeoverMinutes) / 60), 0),
    4,
  );
  const supervisorHours = round(
    stages.reduce((sum, stage) => {
      const hasSupervisor = (stage.responsibleRoleNames || []).some((role) =>
        String(role || "").toLowerCase().includes("super"),
      );
      if (!hasSupervisor) return sum;
      const actualHours = executionByStage[stage.id]?.durationHours;
      const durationHours = num(actualHours) > 0 ? num(actualHours) : num(stage.durationHours || num(stage.durationDays) * 24);
      return sum + durationHours;
    }, 0),
    4,
  );

  const rows = [];
  if (supervisorHours > 0) {
    rows.push({
      id: `ind_supervision_${Math.random().toString(36).slice(2, 8)}`,
      account: "Supervision",
      description: "Supervisión sugerida desde módulo de procesos",
      area: "Produccion",
      includeInProduct: "Si",
      periodValue: 0,
      method: "Horas",
      baseUnit: "Horas",
      usage: supervisorHours,
      baseTotal: supervisorHours,
      behavior: "Fijo",
      observation: "Completar costo del periodo de supervisión.",
      responsible: "",
      support: "Exportado desde Procesos",
      weightedItems: [{ name: "Supervision de proceso", hours: supervisorHours, factor: 1 }],
      kwhUsage: 0,
      kwhTotal: 0,
    });
  }

  if (cleaningHours > 0) {
    rows.push({
      id: `ind_limpieza_${Math.random().toString(36).slice(2, 8)}`,
      account: "Limpieza",
      description: "Limpieza y cambio sugeridos desde módulo de procesos",
      area: "Produccion",
      includeInProduct: "Si",
      periodValue: 0,
      method: "Horas",
      baseUnit: "Horas",
      usage: cleaningHours,
      baseTotal: cleaningHours,
      behavior: "Fijo",
      observation: "Completar costo del periodo de limpieza/cambio.",
      responsible: "",
      support: "Exportado desde Procesos",
      weightedItems: [{ name: "Limpieza y cambio", hours: cleaningHours, factor: 1 }],
      kwhUsage: 0,
      kwhTotal: 0,
    });
  }

  return rows;
}

function buildEquipmentSuggestions(model, stages = [], executionByStage = {}) {
  const equipmentMap = new Map(model.entities.equipments.map((item) => [item.id, item]));
  const areasMap = new Map(model.entities.areas.map((item) => [item.id, item]));
  const hoursByEquipment = {};

  stages.forEach((stage) => {
    const actualHours = executionByStage[stage.id]?.durationHours;
    const durationHours = num(actualHours) > 0 ? num(actualHours) : num(stage.durationHours || num(stage.durationDays) * 24);
    (stage.defaultEquipmentIds || []).forEach((equipmentId) => {
      hoursByEquipment[equipmentId] = (hoursByEquipment[equipmentId] || 0) + durationHours;
    });
  });

  const equipmentIds = Object.keys(hoursByEquipment);

  const equipLibrary = equipmentIds.map((equipmentId) => {
    const equipment = equipmentMap.get(equipmentId) || {};
    const area = areasMap.get(equipment.areaId || "") || {};
    return {
      id: equipmentId,
      name: equipment.name || equipment.code || "Equipo de proceso",
      area: area.name || "Produccion",
      purchaseValue: 0,
      purchaseDate: "",
      lifeValue: 60,
      lifeUnit: "meses",
      hoursMonth: Math.max(1, Math.ceil(num(equipment.nominalCapacityPerMonth) || 1)),
      residualValue: 0,
      method: "linea recta",
      observation: `Completar valor del equipo. Capacidad declarada: ${num(equipment.nominalCapacityPerDay)} ${normalizeCostUnitLabel(equipment.capacityUnitCode)} por día.`,
      responsible: "",
      support: "Exportado desde Procesos",
    };
  });

  const equipUse = equipmentIds.map((equipmentId) => ({
    libraryId: equipmentId,
    behavior: "Fijo",
    hoursUsed: round(hoursByEquipment[equipmentId], 4),
    observation: "Horas sugeridas desde etapas del proceso.",
  }));

  const equipmentUsage = equipmentIds.map((equipmentId) => {
    const equipment = equipmentMap.get(equipmentId) || {};
    const area = areasMap.get(equipment.areaId || "") || {};
    return {
      equipmentId,
      equipmentName: equipment.name || equipment.code || "Equipo de proceso",
      areaName: area.name || "",
      hoursUsed: round(hoursByEquipment[equipmentId], 4),
      setupMinutes: num(equipment.setupMinutes),
      capacityUnitCode: equipment.capacityUnitCode || "",
    };
  });

  return { equipLibrary, equipUse, equipmentUsage };
}

function buildOutputRows(batch, product, processSummary) {
  const technicalUnit = normalizeCostUnitLabel(processSummary.unitCode || batch?.plannedUnitCode || product?.baseUnitCode || "Kg");
  const technicalQty = num(processSummary.usefulQty) > 0 ? num(processSummary.usefulQty) : num(batch?.plannedQuantity);
  const commercialUnit = normalizeCostUnitLabel(batch?.plannedUnitCode || "");
  const commercialQty = num(batch?.plannedQuantity);
  const note = commercialQty > 0
    ? `Equivale al plan comercial de ${commercialQty} ${commercialUnit}. Completar precio de venta o NRV en Costos.`
    : "Completar precio de venta o NRV en Costos.";

  return [
    {
      name: product?.name || batch?.batchCode || "Salida principal",
      outputType: "Salida principal",
      size: 1,
      unit: technicalUnit,
      qtyOut: round(technicalQty, 4),
      costPct: 100,
      currentPrice: 0,
      nrvCost: 0,
      note,
    },
  ];
}

function buildStageBreakdown(stages = [], executionByStage = {}, areasMap = new Map(), equipmentMap = new Map()) {
  return stages.map((stage) => {
    const execution = executionByStage[stage.id] || null;
    const durationHours = num(execution?.durationHours) > 0
      ? num(execution.durationHours)
      : num(stage.durationHours || num(stage.durationDays) * 24);
    const operatorHours = num(stage.operatorCount) > 0 ? round(num(stage.operatorCount) * durationHours, 4) : 0;
    return {
      stageId: stage.id,
      stageCode: stage.code,
      stageName: stage.name,
      sequence: num(stage.sequence),
      stageType: stage.stageType,
      durationHours: round(durationHours, 4),
      operatorCount: num(stage.operatorCount),
      operatorHours,
      responsibleRoleNames: stage.responsibleRoleNames || [],
      controlItems: stage.controlItems || [],
      requiredRecordNames: stage.requiredRecordNames || [],
      areaName: areasMap.get(stage.areaId || "")?.name || "",
      defaultEquipment: (stage.defaultEquipmentIds || []).map((id) => equipmentMap.get(id)?.name || id),
      inputLotCode: execution?.inputLotCode || "",
      outputLotCode: execution?.outputLotCode || "",
      inputQuantity: num(execution?.inputQuantity),
      inputUnitCode: execution?.inputUnitCode || stage.inputUnitCode,
      outputQuantity: num(execution?.outputQuantity),
      outputUnitCode: execution?.outputUnitCode || stage.outputUnitCode,
      wasteQuantity: num(execution?.wasteQuantity),
      wasteUnitCode: execution?.wasteUnitCode || stage.wasteUnitCode,
      yieldPct: num(execution?.yieldPct),
    };
  });
}

export function buildOptionalCostIntegrationPayload(data, { batchId = "", formulaId = "", plannedOutputQuantity = 0, plannedOutputUnitCode = "" } = {}) {
  const model = migrateProcessPlanningPayload(data);
  const businessProfile = model.metadata?.businessProfile || {};
  const batch = batchId ? model.entities.batches.find((item) => item.id === batchId) : null;
  const flow = batch ? model.entities.flowVersions.find((item) => item.id === batch.flowVersionId) : null;
  const product = batch ? model.entities.products.find((item) => item.id === batch.productId) : null;

  const selectedFormulaId = formulaId || (flow?.formulaId || "");
  const formulaRequirements = selectedFormulaId
    ? explodeFormulaRequirements(model, {
      formulaId: selectedFormulaId,
      plannedOutputQuantity: plannedOutputQuantity || batch?.plannedQuantity || 0,
      plannedOutputUnitCode: plannedOutputUnitCode || batch?.plannedUnitCode || "",
    })
    : { valid: true, items: [], issues: [] };

  const traceability = batch ? calculateBatchTraceability(model, batch.id) : [];
  const wasteSummary = batch ? calculateFlowWasteSummary(model, batch.id) : null;
  const processSummary = buildComparableProcessSummary(batch, wasteSummary, traceability);

  const stages = flow
    ? model.entities.processStages
      .filter((item) => item.flowVersionId === flow.id)
      .sort((a, b) => num(a.sequence) - num(b.sequence))
    : [];

  const executions = batch
    ? model.entities.stageExecutions
      .filter((item) => item.batchId === batch.id)
      .sort((a, b) => num(a.sequence) - num(b.sequence))
    : [];
  const executionByStage = executions.reduce((acc, item) => {
    acc[item.stageId] = item;
    return acc;
  }, {});

  const areasMap = new Map(model.entities.areas.map((item) => [item.id, item]));
  const equipmentMap = new Map(model.entities.equipments.map((item) => [item.id, item]));

  const materialRows = buildMaterialRows(formulaRequirements);
  const laborRows = buildLaborRows(stages, executionByStage);
  const indirectRows = buildIndirectDriverRows(stages, executionByStage);
  const { equipLibrary, equipUse, equipmentUsage } = buildEquipmentSuggestions(model, stages, executionByStage);
  const outputs = buildOutputRows(batch, product, processSummary);

  const directRows = [...materialRows, ...laborRows].map((row) => ({
    account: row.account,
    description: row.description,
    unit: row.unit,
    qty: row.qty,
    unitCost: row.unitCost,
    behavior: row.behavior,
  }));

  const commercialPresentations = batch
    ? [{
      quantity: num(batch.plannedQuantity),
      unit: normalizeCostUnitLabel(batch.plannedUnitCode),
      label: `${num(batch.plannedQuantity)} ${normalizeCostUnitLabel(batch.plannedUnitCode)}`,
    }]
    : [];

  const totalDirectLaborHours = round(laborRows.reduce((sum, item) => sum + num(item.qty), 0), 4);
  const bottleneckStage = wasteSummary?.stageSummaries?.reduce((highest, item) => {
    const wasteQty = num(item.wasteQuantity);
    if (!highest) return item;
    return wasteQty > num(highest.wasteQuantity) ? item : highest;
  }, null);

  return {
    integrationType: "process-planning-to-costs",
    generatedAt: new Date().toISOString(),
    optional: false,
    sourceModule: {
      code: model.metadata?.moduleCode || "MOD-PROCESOS-CAPACIDAD-PLANEACION",
      name: model.metadata?.moduleName || "Modulo de Procesos, Capacidad y Planeacion",
      schemaVersion: model.schemaVersion || "",
    },
    batch: batch
      ? {
        id: batch.id,
        batchCode: batch.batchCode,
        productId: batch.productId,
        productName: product?.name || "",
        flowVersionId: batch.flowVersionId,
        flowName: flow?.name || "",
        plannedQuantity: num(batch.plannedQuantity),
        plannedUnitCode: batch.plannedUnitCode,
        plannedStartDate: batch.plannedStartDate,
        plannedEndDate: batch.plannedEndDate,
        priority: batch.priority,
        lineId: batch.lineId,
        lineName: model.entities.productionLines.find((item) => item.id === batch.lineId)?.name || "",
      }
      : null,
    processSummary: {
      comparableInputQty: processSummary.inputQty,
      comparableUsefulQty: processSummary.usefulQty,
      comparableWasteQty: processSummary.wasteQty,
      comparableUnitCode: processSummary.unitCode,
      yieldPct: processSummary.yieldPct,
      wastePct: processSummary.wastePct,
      totalDirectLaborHours,
      batchLots: {
        inputLotCode: traceability[0]?.inputLotCode || processSummary.inputLotCode || "",
        outputLotCode: traceability[traceability.length - 1]?.outputLotCode || processSummary.outputLotCode || "",
      },
      commercialPresentation: commercialPresentations,
      bottleneckByWaste: bottleneckStage
        ? {
          stageId: bottleneckStage.stageId,
          stageName: stages.find((item) => item.id === bottleneckStage.stageId)?.name || "",
          wasteQuantity: num(bottleneckStage.wasteQuantity),
          wasteUnitCode: bottleneckStage.wasteUnitCode || "",
        }
        : null,
    },
    materials: materialRows,
    labor: laborRows,
    equipmentUsage,
    outputs,
    indirectDrivers: indirectRows.map((item) => ({
      account: item.account,
      method: item.method,
      usage: item.usage,
      baseUnit: item.baseUnit,
      observation: item.observation,
    })),
    traceability: {
      stageCount: traceability.length,
      stages: buildStageBreakdown(stages, executionByStage, areasMap, equipmentMap),
    },
    issues: formulaRequirements.issues,
    costeoReady: {
      general: {
        documentId: businessProfile.documentCode || batch?.batchCode || "",
        orgName: businessProfile.organization || model.metadata?.vendor || "",
        responsible: businessProfile.responsible || "Completar desde Costos",
        responsibleRole: businessProfile.responsibleRole || "Produccion",
        productName: product?.name || batch?.batchCode || "",
        activityType: businessProfile.operationType || "Producto",
        period: businessProfile.period || "por lote",
        baseUnit: normalizeCostUnitLabel(processSummary.unitCode || product?.baseUnitCode || batch?.plannedUnitCode || "Kg"),
        profitPct: 30,
        wholesaleMarginPct: 18,
        wholesaleMinQty: 12,
        currentPriceBase: 0,
        vatApplies: "no",
        vatPct: 15,
        notes: unique([
          businessProfile.notes || "",
          flow?.name ? `Flujo: ${flow.name}` : "",
          batch?.batchCode ? `Lote: ${batch.batchCode}` : "",
          commercialPresentations[0]?.label ? `Presentacion comercial: ${commercialPresentations[0].label}` : "",
          processSummary.wasteQty > 0 ? `Merma comparable: ${processSummary.wasteQty} ${normalizeCostUnitLabel(processSummary.unitCode)} (${processSummary.wastePct}%).` : "",
          totalDirectLaborHours > 0 ? `Horas-persona directas sugeridas: ${totalDirectLaborHours}.` : "",
        ]).join(" | "),
        inputQty: processSummary.inputQty,
        inputUnit: normalizeCostUnitLabel(processSummary.unitCode || batch?.plannedUnitCode || product?.baseUnitCode || "Kg"),
        transformBaseUnit: normalizeCostUnitLabel(processSummary.unitCode || batch?.plannedUnitCode || product?.baseUnitCode || "Kg"),
      },
      state: {
        direct: directRows,
        indirect: indirectRows,
        commercial: [],
        certifications: [],
        equipLibrary,
        equipUse,
        outputs,
        market: [],
      },
    },
  };
}

export function publishIntegrationFlag(data, enabled = false) {
  const model = migrateProcessPlanningPayload(data);
  model.integration.costs.enabled = Boolean(enabled);
  model.integration.costs.lastPublishedAt = enabled ? new Date().toISOString() : "";
  return model;
}
