export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class DuplicateQueuedOperationError extends Error {
  constructor(key) {
    super(`Operation with key "${key}" is already queued.`);
    this.key = key;
  }
}
