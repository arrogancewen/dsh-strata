export class StrataError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'StrataError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function assert(condition, code, message, details) {
  if (!condition) throw new StrataError(code, message, details);
}
