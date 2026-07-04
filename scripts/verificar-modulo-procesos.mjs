import {
  buildCapacityReport,
  buildOperationalDashboard,
  buildEntityRelations,
  buildOptionalCostIntegrationPayload,
  calculateCapacitySnapshot,
  createStarterModuleSeed,
  createFunctionalExampleSeed,
  explodeFormulaRequirements,
  validateProcessPlanningData,
} from "../src/modulo-procesos-capacidad-planeacion/index.js";

const seed = createStarterModuleSeed();
const functionalSeed = createFunctionalExampleSeed();
const validation = validateProcessPlanningData(seed);
const functionalValidation = validateProcessPlanningData(functionalSeed);
const batch = seed.entities.batches[0];
const formula = seed.entities.masterFormulas[0];

const summary = {
  validation: {
    valid: validation.valid,
    issueCount: validation.issues.length,
  },
  functionalValidation: {
    valid: functionalValidation.valid,
    issueCount: functionalValidation.issues.length,
  },
  relations: Object.keys(buildEntityRelations(seed)).length,
  functionalDashboard: buildOperationalDashboard(functionalSeed).summary,
  functionalCapacity: buildCapacityReport(functionalSeed, "day").slice(0, 2),
  capacity: calculateCapacitySnapshot(seed, { lineId: seed.entities.productionLines[0]?.id || "" }),
  formulaExplosion: explodeFormulaRequirements(seed, {
    formulaId: formula.id,
    plannedOutputQuantity: 250,
    plannedOutputUnitCode: "kg",
  }),
  costIntegration: buildOptionalCostIntegrationPayload(seed, {
    batchId: batch.id,
  }),
};

console.log(JSON.stringify(summary, null, 2));

if (!validation.valid || !functionalValidation.valid) {
  process.exitCode = 1;
}
