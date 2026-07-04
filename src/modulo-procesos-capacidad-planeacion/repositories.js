import { createFunctionalExampleSeed, createStarterModuleSeed } from "./seed.js";
import { migrateProcessPlanningPayload } from "./migrations.js";

export const PROCESS_PLANNING_STORAGE_KEY = "junglelab_process_planning_module";

function createDefaultSeed() {
  return createFunctionalExampleSeed();
}

export class InMemoryProcessPlanningRepository {
  constructor(seedData = createDefaultSeed()) {
    this.current = migrateProcessPlanningPayload(seedData);
  }

  async load() {
    return migrateProcessPlanningPayload(this.current);
  }

  async save(payload) {
    this.current = migrateProcessPlanningPayload(payload);
    return this.load();
  }
}

export class BrowserLocalStorageProcessPlanningRepository {
  constructor(storageKey = PROCESS_PLANNING_STORAGE_KEY, storage = globalThis.localStorage) {
    this.storageKey = storageKey;
    this.storage = storage;
  }

  async load() {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      if (!raw) return createDefaultSeed();
      const normalized = migrateProcessPlanningPayload(JSON.parse(raw));
      if ((normalized?.entities?.flowVersions || []).length <= 1) {
        return createDefaultSeed();
      }
      return normalized;
    } catch {
      return createDefaultSeed();
    }
  }

  async save(payload) {
    const normalized = migrateProcessPlanningPayload(payload);
    this.storage?.setItem(this.storageKey, JSON.stringify(normalized));
    return normalized;
  }
}
