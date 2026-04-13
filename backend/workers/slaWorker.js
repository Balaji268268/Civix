/**
 * SLA Watchdog Worker
 * Monitors issues against SLA targets based on Priority:
 * - High: 24 hours to 'In Progress'
 * - Medium: 72 hours to 'In Progress'
 * - Low: 7 days to 'In Progress'
 * Escalates breaches with notifications and timeline tracking.
 */

const Issue = require('../models/issues');
const Notification = require('../models/notification');

const SLA_LIMITS_MS = {
  'High': 24 * 60 * 60 * 1000,
  'Medium': 72 * 60 * 60 * 1000,
  'Low': 7 * 24 * 60 * 60 * 1000
};

async function checkSLABreaches() {
  const now = Date.now();

  try {
    const unhandledIssues = await Issue.find({
      status: { $in: ['Received', 'Assigned', 'Pending'] },
      'sla.breached': { $ne: true }
    });

    for (const issue of unhandledIssues) {
      const allowedTime = SLA_LIMITS_MS[issue.priority] || SLA_LIMITS_MS['Medium'];
      const elapsed = now - new Date(issue.createdAt).getTime();

      if (elapsed > allowedTime) {
        issue.sla = issue.sla || {};
        issue.sla.breached = true;
        issue.sla.escalatedAt = new Date();
        issue.priorityScore = (issue.priorityScore || 0) + 50; // Priority escalation
        
        issue.timeline.push({
          status: issue.status,
          message: `🚨 SLA Threshold Breached (${issue.priority} priority exceeded ${allowedTime / 3600000}h). Automatically escalated.`,
          byUser: 'SLA Watchdog'
        });

        await issue.save();

        // Alert Admin and Assigned Officer
        await Notification.create({
          recipient: 'admin',
          title: `SLA Breach Alert: ${issue.complaintId}`,
          message: `Issue "${issue.title}" (${issue.priority} Priority) has breached its SLA limit.`,
          type: 'warning',
          relatedId: issue._id
        });

        console.log(`[SLA Watchdog] Issue ${issue.complaintId} escalated due to SLA breach.`);
      }
    }
  } catch (err) {
    console.error('[SLA Watchdog] Error checking breaches:', err.message);
  }
}

module.exports = {
  checkSLABreaches
};
