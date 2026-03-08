import { createDeferred } from "./deferred.js";
import { DuplicateQueuedOperationError } from "../utils/errors.js";

export class OperationQueue {
  constructor({ name, intervalMs }) {
    this.name = name;
    this.intervalMs = intervalMs;

    this.jobsByKey = new Map();
    this.keys = [];

    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.processBatch();
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  getPendingCount() {
    return this.jobsByKey.size;
  }

  enqueue({ key, dedupePolicy, run }) {
    const existing = this.jobsByKey.get(key);
    if (existing) {
      if (dedupePolicy === "merge") {
        return existing.deferred.promise;
      }

      throw new DuplicateQueuedOperationError(key);
    }

    const deferred = createDeferred();
    const job = {
      key,
      run: async () => run(),
      deferred
    };

    this.jobsByKey.set(key, job);
    this.keys.push(key);

    return deferred.promise;
  }

  async processBatch() {
    if (this.isProcessing || this.keys.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const keysToProcess = [...this.keys];
      this.keys = [];

      const jobs = [];
      for (const key of keysToProcess) {
        const job = this.jobsByKey.get(key);
        if (!job) {
          continue;
        }

        this.jobsByKey.delete(key);
        jobs.push(job);
      }

      for (const job of jobs) {
        try {
          const result = await job.run();
          job.deferred.resolve(result);
        } catch (error) {
          job.deferred.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
