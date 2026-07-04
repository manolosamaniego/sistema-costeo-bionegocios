import { migrateProcessPlanningPayload } from "./migrations.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function indexBy(items = [], key = "id") {
  return new Map(items.map((item) => [item[key], item]));
}

function pushError(errors, code, entity, id, message) {
  errors.push({ level: "error", code, entity, id, message });
}

function pushWarning(errors, code, entity, id, message) {
  errors.push({ level: "warning", code, entity, id, message });
}

export function getUnitCatalogMaps(data) {
  const units = data.catalogs?.unitDefinitions || [];
  return {
    byCode: new Map(units.map((unit) => [unit.code, unit])),
  };
}

export function validateCompatibleUnitPair(data, fromUnitCode, toUnitCode) {
  const { byCode } = getUnitCatalogMaps(data);
  const from = byCode.get(fromUnitCode);
  const to = byCode.get(toUnitCode);
  if (!from || !to) return false;
  return from.dimension === to.dimension;
}

export function validateProcessPlanningData(payload = {}) {
  const data = migrateProcessPlanningPayload(payload);
  const issues = [];
  const { byCode: unitsByCode } = getUnitCatalogMaps(data);

  const productsById = indexBy(data.entities.products);
  const linesById = indexBy(data.entities.productionLines);
  const areasById = indexBy(data.entities.areas);
  const flowsById = indexBy(data.entities.flowVersions);
  const stagesById = indexBy(data.entities.processStages);
  const resourcesById = indexBy(data.entities.resources);
  const equipmentsById = indexBy(data.entities.equipments);
  const materialsById = indexBy(data.entities.materials);
  const formulasById = indexBy(data.entities.masterFormulas);
  const batchesById = indexBy(data.entities.batches);

  data.entities.products.forEach((product) => {
    if (!product.code || !product.name) pushError(issues, "product_required_fields", "product", product.id, "Todo producto debe tener codigo y nombre.");
    if (!unitsByCode.get(product.baseUnitCode)) pushError(issues, "product_invalid_unit", "product", product.id, "El producto debe usar una unidad base valida.");
  });

  data.entities.productionLines.forEach((line) => {
    if (!line.code || !line.name) pushError(issues, "line_required_fields", "productionLine", line.id, "Toda linea debe tener codigo y nombre.");
  });

  data.entities.areas.forEach((area) => {
    if (!linesById.get(area.lineId)) pushError(issues, "area_missing_line", "area", area.id, "El area debe pertenecer a una linea valida.");
    if (!area.code || !area.name) pushError(issues, "area_required_fields", "area", area.id, "Toda area debe tener codigo y nombre.");
  });

  data.entities.flowVersions.forEach((flow) => {
    if (!productsById.get(flow.productId)) pushError(issues, "flow_missing_product", "flowVersion", flow.id, "La version de flujo debe pertenecer a un producto.");
    if (!linesById.get(flow.lineId)) pushError(issues, "flow_missing_line", "flowVersion", flow.id, "La version de flujo debe pertenecer a una linea.");
    if (flow.formulaId && !formulasById.get(flow.formulaId)) pushError(issues, "flow_missing_formula", "flowVersion", flow.id, "La formula maestra operativa asociada no existe.");
  });

  data.entities.processStages.forEach((stage) => {
    if (!flowsById.get(stage.flowVersionId)) pushError(issues, "stage_missing_flow", "processStage", stage.id, "La etapa debe pertenecer a una version de flujo.");
    if (!linesById.get(stage.lineId)) pushError(issues, "stage_missing_line", "processStage", stage.id, "La etapa debe pertenecer a una linea.");
    if (!stage.inputUnitCode || !stage.outputUnitCode || !stage.wasteUnitCode) {
      pushError(issues, "stage_missing_units", "processStage", stage.id, "Cada etapa debe definir unidad de entrada, salida y merma.");
    }
    if (!stage.requiresLotTraceability) {
      pushWarning(issues, "stage_traceability_disabled", "processStage", stage.id, "La trazabilidad por lote deberia permanecer activa por regla del modulo.");
    }
    if (!unitsByCode.get(stage.inputUnitCode) || !unitsByCode.get(stage.outputUnitCode) || !unitsByCode.get(stage.wasteUnitCode)) {
      pushError(issues, "stage_invalid_units", "processStage", stage.id, "La etapa tiene unidades no registradas en catalogos.");
    }
    if (unitsByCode.get(stage.capacityUnitCode) === undefined) {
      pushError(issues, "stage_invalid_capacity_unit", "processStage", stage.id, "La etapa tiene una unidad de capacidad no registrada.");
    }
    if (stage.maxCapacityUnitCode && unitsByCode.get(stage.maxCapacityUnitCode) === undefined) {
      pushError(issues, "stage_invalid_max_capacity_unit", "processStage", stage.id, "La etapa tiene una unidad de capacidad maxima no registrada.");
    }
    if (num(stage.durationHours) <= 0 && num(stage.durationDays) <= 0) {
      pushError(issues, "stage_invalid_duration", "processStage", stage.id, "La etapa debe soportar procesos cortos o multidia con una duracion mayor que cero.");
    }
    if (num(stage.operatorCount) < 0) {
      pushError(issues, "stage_invalid_operator_count", "processStage", stage.id, "La cantidad de operarios no puede ser negativa.");
    }
  });

  data.entities.masterFormulas.forEach((formula) => {
    if (!productsById.get(formula.productId)) pushError(issues, "formula_missing_product", "masterFormula", formula.id, "La formula operativa debe pertenecer a un producto.");
    if (!flowsById.get(formula.flowVersionId)) pushError(issues, "formula_missing_flow", "masterFormula", formula.id, "La formula operativa debe pertenecer a una version de flujo.");
    if (!unitsByCode.get(formula.outputUnitCode)) pushError(issues, "formula_invalid_output_unit", "masterFormula", formula.id, "La formula operativa debe tener unidad de salida valida.");
    formula.items.forEach((item) => {
      if (!materialsById.get(item.materialId)) pushError(issues, "formula_missing_material", "masterFormulaItem", item.id, "El material referenciado por la formula no existe.");
      if (!stagesById.get(item.stageId)) pushError(issues, "formula_missing_stage", "masterFormulaItem", item.id, "Cada item de formula debe indicar en que etapa se consume.");
      if (!unitsByCode.get(item.unitCode)) pushError(issues, "formula_invalid_unit", "masterFormulaItem", item.id, "El item de formula usa una unidad no registrada.");
      const stage = stagesById.get(item.stageId);
      if (stage && stage.flowVersionId !== formula.flowVersionId) {
        pushError(issues, "formula_stage_flow_mismatch", "masterFormulaItem", item.id, "La etapa del item de formula no pertenece al mismo flujo de la formula.");
      }
    });
  });

  data.entities.stageExecutions.forEach((execution) => {
    if (!batchesById.get(execution.batchId)) pushError(issues, "execution_missing_batch", "stageExecution", execution.id, "La ejecucion de etapa debe pertenecer a un lote.");
    const batch = batchesById.get(execution.batchId);
    const stage = stagesById.get(execution.stageId);
    if (!stage) pushError(issues, "execution_missing_stage", "stageExecution", execution.id, "La ejecucion debe referenciar una etapa valida.");
    if (batch && stage && batch.flowVersionId !== stage.flowVersionId) {
      pushError(issues, "execution_batch_stage_flow_mismatch", "stageExecution", execution.id, "La etapa registrada no pertenece al flujo configurado en el lote.");
    }
    if (!execution.inputLotCode || !execution.outputLotCode) {
      pushError(issues, "execution_missing_lots", "stageExecution", execution.id, "Cada etapa debe registrar lote de entrada y lote de salida.");
    }
    if (num(execution.inputQuantity) <= 0) pushError(issues, "execution_invalid_input_qty", "stageExecution", execution.id, "La cantidad de entrada debe ser mayor a cero.");
    if (num(execution.outputQuantity) < 0 || num(execution.wasteQuantity) < 0) pushError(issues, "execution_invalid_output_qty", "stageExecution", execution.id, "Las cantidades de salida y merma no pueden ser negativas.");
    if (!unitsByCode.get(execution.inputUnitCode) || !unitsByCode.get(execution.outputUnitCode) || !unitsByCode.get(execution.wasteUnitCode)) {
      pushError(issues, "execution_invalid_units", "stageExecution", execution.id, "La ejecucion tiene unidades no registradas.");
    }
    if (stage) {
      if (!validateCompatibleUnitPair(data, stage.inputUnitCode, execution.inputUnitCode)) {
        pushError(issues, "execution_incompatible_input_unit", "stageExecution", execution.id, "La unidad de entrada no es compatible con la configurada en la etapa.");
      }
      if (!validateCompatibleUnitPair(data, stage.outputUnitCode, execution.outputUnitCode)) {
        pushError(issues, "execution_incompatible_output_unit", "stageExecution", execution.id, "La unidad de salida no es compatible con la configurada en la etapa.");
      }
      if (!validateCompatibleUnitPair(data, stage.wasteUnitCode, execution.wasteUnitCode)) {
        pushError(issues, "execution_incompatible_waste_unit", "stageExecution", execution.id, "La unidad de merma no es compatible con la configurada en la etapa.");
      }
    }
    const expectedYield = num(execution.inputQuantity) > 0
      ? ((num(execution.outputQuantity) / num(execution.inputQuantity)) * 100)
      : 0;
    if (Math.abs(expectedYield - num(execution.yieldPct)) > 0.5) {
      pushWarning(issues, "execution_yield_mismatch", "stageExecution", execution.id, "El rendimiento almacenado no coincide con la relacion entre entrada y salida util.");
    }
    execution.traceLinks.forEach((link) => {
      if (!link.inputLotCode || !link.outputLotCode) {
        pushError(issues, "trace_link_missing_lots", "traceLink", link.id, "Cada relacion de trazabilidad debe incluir lote origen y lote destino.");
      }
      if (!unitsByCode.get(link.unitCode)) {
        pushError(issues, "trace_link_invalid_unit", "traceLink", link.id, "La relacion de trazabilidad usa una unidad no registrada.");
      }
    });
  });

  const executionsByBatch = data.entities.stageExecutions.reduce((acc, execution) => {
    acc[execution.batchId] = acc[execution.batchId] || [];
    acc[execution.batchId].push(execution);
    return acc;
  }, {});

  Object.values(executionsByBatch).forEach((batchExecutions) => {
    const ordered = batchExecutions.slice().sort((a, b) => num(a.sequence) - num(b.sequence));
    const seenSequences = new Set();
    ordered.forEach((execution, index) => {
      if (seenSequences.has(execution.sequence)) {
        pushError(issues, "execution_duplicate_sequence", "stageExecution", execution.id, "No puede haber dos etapas del mismo lote con la misma secuencia.");
      }
      seenSequences.add(execution.sequence);

      const previous = ordered[index - 1];
      if (previous && previous.outputLotCode && execution.inputLotCode && previous.outputLotCode !== execution.inputLotCode) {
        pushError(issues, "execution_trace_chain_broken", "stageExecution", execution.id, "La cadena de trazabilidad entre etapas consecutivas del lote esta rota.");
      }
    });
  });

  data.entities.resources.forEach((resource) => {
    if (resource.lineId && !linesById.get(resource.lineId)) pushError(issues, "resource_missing_line", "resource", resource.id, "El recurso apunta a una linea inexistente.");
    if (resource.areaId && !areasById.get(resource.areaId)) pushError(issues, "resource_missing_area", "resource", resource.id, "El recurso apunta a un area inexistente.");
    if (!unitsByCode.get(resource.capacityUnitCode)) pushError(issues, "resource_invalid_capacity_unit", "resource", resource.id, "El recurso tiene una unidad de capacidad no registrada.");
  });

  data.entities.equipments.forEach((equipment) => {
    if (equipment.lineId && !linesById.get(equipment.lineId)) pushError(issues, "equipment_missing_line", "equipment", equipment.id, "El equipo apunta a una linea inexistente.");
    if (equipment.areaId && !areasById.get(equipment.areaId)) pushError(issues, "equipment_missing_area", "equipment", equipment.id, "El equipo apunta a un area inexistente.");
    if (!unitsByCode.get(equipment.capacityUnitCode)) pushError(issues, "equipment_invalid_capacity_unit", "equipment", equipment.id, "El equipo tiene una unidad de capacidad no registrada.");
    equipment.supportedUnitCodes.forEach((unitCode) => {
      if (!unitsByCode.get(unitCode)) pushError(issues, "equipment_invalid_supported_unit", "equipment", equipment.id, "El equipo declara una unidad soportada no registrada.");
    });
  });

  data.entities.calendarEntries.forEach((entry) => {
    if (!linesById.get(entry.lineId)) pushError(issues, "calendar_missing_line", "calendarEntry", entry.id, "El calendario debe pertenecer a una linea valida.");
    if (num(entry.availableHours) < 0) pushError(issues, "calendar_invalid_hours", "calendarEntry", entry.id, "Las horas disponibles del calendario no pueden ser negativas.");
    if (num(entry.availableAreaM2) < 0) pushError(issues, "calendar_invalid_area", "calendarEntry", entry.id, "El area disponible del calendario no puede ser negativa.");
  });

  data.entities.warehouseRequirements.forEach((requirement) => {
    if (requirement.batchId && !batchesById.get(requirement.batchId)) pushError(issues, "warehouse_missing_batch", "warehouseRequirement", requirement.id, "El requerimiento de bodega apunta a un lote inexistente.");
    if (requirement.productId && !productsById.get(requirement.productId)) pushError(issues, "warehouse_missing_product", "warehouseRequirement", requirement.id, "El requerimiento de bodega apunta a un producto inexistente.");
  });

  return {
    valid: issues.every((item) => item.level !== "error"),
    issues,
    data,
  };
}
