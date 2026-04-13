/**
 * Central Worker Registry
 * Wires BullMQ / AsyncQueue with worker handlers.
 */

const queue = require('../lib/queue');
const { handleTextScoring } = require('./textScoringWorker');
const { handleImageAnalysis } = require('./imageWorker');
const { handleDuplicateCheck } = require('./duplicateWorker');
const { checkSLABreaches } = require('./slaWorker');

function initWorkers() {
  queue.registerWorker('text_scoring', handleTextScoring);
  queue.registerWorker('image_analysis', handleImageAnalysis);
  queue.registerWorker('duplicate_check', handleDuplicateCheck);

  // Periodic SLA Watchdog check (runs every 10 minutes)
  setInterval(() => {
    checkSLABreaches();
  }, 10 * 60 * 1000);

  console.log('[Worker Engine] Async Workers initialized: text_scoring, image_analysis, duplicate_check, sla_watchdog');
}

module.exports = {
  initWorkers
};
