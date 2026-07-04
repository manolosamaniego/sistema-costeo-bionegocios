import { PROCESS_PLANNING_SCHEMA_VERSION, createModuleData } from "./schema.js";
import { createBaseCatalogSeed } from "./seed.js";

export function normalizeModuleShape(payload = {}) {
  const base = createModuleData();
  const seed = createBaseCatalogSeed();

  return {
    ...base,
    ...payload,
    metadata: {
      ...base.metadata,
      ...(payload.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
    catalogs: {
      ...seed,
      ...(payload.catalogs || {}),
      unitDefinitions: Array.isArray(payload.catalogs?.unitDefinitions) ? payload.catalogs.unitDefinitions : seed.unitDefinitions,
      unitConversions: Array.isArray(payload.catalogs?.unitConversions) ? payload.catalogs.unitConversions : seed.unitConversions,
    },
    entities: {
      ...base.entities,
      ...(payload.entities || {}),
    },
    integration: {
      ...base.integration,
      ...(payload.integration || {}),
      costs: {
        ...base.integration.costs,
        ...(payload.integration?.costs || {}),
      },
    },
  };
}

export function migrateProcessPlanningPayload(payload = {}) {
  const source = payload || {};
  let current = normalizeModuleShape(source);
  const schemaVersion = String(source.schemaVersion || "");

  if (!schemaVersion) {
    current = {
      ...current,
      schemaVersion: PROCESS_PLANNING_SCHEMA_VERSION,
      metadata: {
        ...current.metadata,
        migratedFrom: "unversioned",
      },
    };
  }

  if (schemaVersion && schemaVersion !== PROCESS_PLANNING_SCHEMA_VERSION) {
    current = {
      ...current,
      schemaVersion: PROCESS_PLANNING_SCHEMA_VERSION,
      metadata: {
        ...current.metadata,
        migratedFrom: schemaVersion,
      },
    };
  }

  return current;
}
