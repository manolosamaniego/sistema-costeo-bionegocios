export class ProcessPlanningError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProcessPlanningError";
    this.code = code;
    this.details = details;
  }
}

export function ensure(condition, code, message, details = {}) {
  if (!condition) {
    throw new ProcessPlanningError(code, message, details);
  }
}
