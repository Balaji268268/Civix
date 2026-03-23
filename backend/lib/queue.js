/**
 * Async Job Queue Manager
 * Provides non-blocking, idempotent, retriable queue execution for post-commit ML pipelines.
 */

const EventEmitter = require('events');

class AsyncQueue extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
    this.runningJobs = new Set();
    this.deadLetterQueue = [];
  }

  registerWorker(jobName, handler) {
    this.handlers.set(jobName, handler);
  }

  async enqueue(jobName, payload, options = {}) {
    const { idempotencyKey, retries = 3, backoffMs = 2000 } = options;
    const jobId = idempotencyKey || `${jobName}:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;

    if (this.runningJobs.has(jobId)) {
      return { status: 'already_queued', jobId };
    }

    this.runningJobs.add(jobId);

    // Non-blocking async dispatch (immediate execution with retries)
    setImmediate(async () => {
      let attempts = 0;
      let success = false;
      let lastError = null;

      const handler = this.handlers.get(jobName);
      if (!handler) {
        console.error(`[Queue] No worker registered for job '${jobName}'`);
        this.runningJobs.delete(jobId);
        return;
      }

      while (attempts < retries && !success) {
        attempts += 1;
        const start = Date.now();
        try {
          await handler(payload, { jobId, attempts });
          success = true;
          this.emit('job:completed', { jobName, jobId, durationMs: Date.now() - start });
        } catch (err) {
          lastError = err;
          console.warn(`[Queue] Job '${jobName}' (ID: ${jobId}) failed attempt ${attempts}/${retries}: ${err.message}`);
          if (attempts < retries) {
            await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempts - 1)));
          }
        }
      }

      this.runningJobs.delete(jobId);

      if (!success) {
        console.error(`[Queue DLQ] Job '${jobName}' (ID: ${jobId}) permanently failed. Sent to Dead Letter Queue.`);
        this.deadLetterQueue.push({
          jobName,
          payload,
          jobId,
          error: lastError?.message,
          failedAt: new Date()
        });
        this.emit('job:failed', { jobName, jobId, error: lastError?.message });
      }
    });

    return { status: 'enqueued', jobId };
  }
}

const queue = new AsyncQueue();

module.exports = queue;
