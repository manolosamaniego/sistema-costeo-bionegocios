import {
  buildCapacityReport,
  buildInternalModuleBrief,
  buildOperationalDashboard,
  buildPlanningReport,
  buildRequirementsReport,
  buildWarehouseReport,
  buildWasteReport,
  createFunctionalExampleSeed,
} from "../src/modulo-procesos-capacidad-planeacion/index.js";

const seed = createFunctionalExampleSeed();

const output = {
  dashboard: buildOperationalDashboard(seed),
  capacity: buildCapacityReport(seed, "day"),
  waste: buildWasteReport(seed),
  requirements: buildRequirementsReport(seed),
  warehouse: buildWarehouseReport(seed),
  planning: buildPlanningReport(seed),
  brief: buildInternalModuleBrief(seed),
};

console.log(JSON.stringify(output, null, 2));
