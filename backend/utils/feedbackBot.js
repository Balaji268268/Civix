const Issue = require('../models/issues');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const { callGemini } = require('./gemini'); // Import AI

/**
 * Feedback Analysis Bot (Intelligent Mode)
 * Checks issues at 5 critical lifecycle stages: 24h, 3d, 1w, 1m, 3m.
 * Uses AI Sentiment Analysis to weight Trust Score updates.
 */

let isRunning = false;

// AI Sentiment Analysis Helper
const analyzeSentiment = async (text) => {
    if (!text || text.length < 5) return { score: 0, label: 'Neutral' };

    try {
        const prompt = `Analyze the sentiment of this feedback for a civic issue resolution. 
        Return ONLY a JSON object: {"score": number (-1 to 1), "label": "Positive"|"Neutral"|"Negative"|"Toxic"}.
        Feedback: "${text}"`;

        const response = await callGemini(prompt);
        const cleanJson = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Sentiment Analysis Failed:", e.message);
        return { score: 0, label: 'Neutral' }; // Fallback
    }
};

const analyzeFeedbackLoop = async () => {
    if (isRunning) {
        console.log("[FeedbackBot] ⚠️ Previous analysis still running. Skipping.");
        return;
    }

    isRunning = true;
    console.log("[FeedbackBot] 🤖 Starting Lifecycle Check (5 Stages)...");

    let processedCount = 0;
    let updateCount = 0;

    try {
        const now = new Date();

        // Find issues that need checking based on missing flags
        const cursor = Issue.find({
            status: { $in: ['Resolved', 'Closed'] },
            'resolution.submittedAt': { $exists: true },
            $or: [
                { 'feedbackTimeline.checks.h24': false },
                { 'feedbackTimeline.checks.d3': false },
                { 'feedbackTimeline.checks.w1': false }, // 1 Week
                { 'feedbackTimeline.checks.m1': false }, // 1 Month
                { 'feedbackTimeline.checks.m3': false }  // 3 Months
            ]
        }).cursor();

        for (let issue = await cursor.next(); issue != null; issue = await cursor.next()) {

            // Worker Sharding (same as before)
            if (global.workerId && global.totalWorkers) {
                const docId = issue._id.toString();
                const hash = parseInt(docId.slice(-2), 16);
                if (hash % global.totalWorkers !== (global.workerId - 1)) continue;
            }

            try {
                const resolvedTime = new Date(issue.resolution.submittedAt);
                const diffMs = now - resolvedTime;
                const diffHours = diffMs / (1000 * 60 * 60);
                const diffDays = diffHours / 24;

                if (!issue.feedbackTimeline) issue.feedbackTimeline = { checks: {} };
                let checks = issue.feedbackTimeline.checks || {};
                let needsSave = false;
                let updatesMade = [];

                // 1. 24-Hour Check
                if (diffHours >= 24 && !checks.h24) {
                    await processTimeframe(issue, '24h');
                    checks.h24 = true;
                    needsSave = true;
                    updatesMade.push('24h');
                }

                // 2. 3-Day Check
                if (diffDays >= 3 && !checks.d3) {
                    await processTimeframe(issue, '3d');
                    checks.d3 = true;
                    needsSave = true;
                    updatesMade.push('3d');
                }

                // 3. 1-Week Check (7 Days)
                if (diffDays >= 7 && !checks.w1) {
                    await processTimeframe(issue, '1w');
                    checks.w1 = true;
                    needsSave = true;
                    updatesMade.push('1w');
                }

                // 4. 1-Month Check (30 Days)
                if (diffDays >= 30 && !checks.m1) {
                    await processTimeframe(issue, '1m');
                    checks.m1 = true;
                    needsSave = true;
                    updatesMade.push('1m');
                }

                // 5. 3-Month Check (90 Days) - Final
                if (diffDays >= 90 && !checks.m3) {
                    await processTimeframe(issue, '3m');
                    checks.m3 = true;
                    needsSave = true;
                    updatesMade.push('3m');
                }

                if (needsSave) {
                    issue.markModified('feedbackTimeline');
                    await issue.save();
                    updateCount++;
                }
                processedCount++;

            } catch (innerErr) {
                console.error(`[FeedbackBot] Error on issue ${issue._id}:`, innerErr.message);
            }
        }

    } catch (err) {
        console.error("[FeedbackBot] Critical Error:", err.message);
    } finally {
        isRunning = false;
        if (updateCount > 0) {
            console.log(`[FeedbackBot] 🏁 Cycle Complete. Updated ${updateCount}/${processedCount} issues.`);
        }
    }
};

const processTimeframe = async (issue, label) => {
    // Get feedbacks up to now
    const feedbacks = issue.feedbacks || [];
    if (feedbacks.length === 0) return;

    // 1. Calculate Average Star Rating (All time)
    const totalStars = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const avgStars = totalStars / feedbacks.length;

    // 2. Identify NEW Feedbacks that need AI Analysis
    // We only call AI for comments that have NOT been scored yet.
    let newSentimentSum = 0;
    let newSentimentCount = 0;
    let existingSentimentSum = 0;
    let existingSentimentCount = 0;
    let hasUpdates = false;

    for (let f of feedbacks) {
        if (f.comment && f.comment.length > 5 && f.sentimentScore === undefined) {
            // New Comment -> Analyze (Only if score is completely missing)
            const aiResult = await analyzeSentiment(f.comment);
            f.sentimentScore = aiResult.score;
            f.sentimentLabel = aiResult.label;

            newSentimentSum += aiResult.score;
            newSentimentCount++;
            hasUpdates = true;
        } else if (typeof f.sentimentScore === 'number') {
            // Existing Scored Comment -> Just Load
            existingSentimentSum += f.sentimentScore;
            existingSentimentCount++;
        }
    }

    // If we computed new sentiments, the parent loop's save() will persist them.
    // We don't need to re-save here explicitly, just calculate the total average.

    const totalSentimentCount = newSentimentCount + existingSentimentCount;
    const totalSentimentSum = newSentimentSum + existingSentimentSum;
    const avgSentiment = totalSentimentCount > 0 ? (totalSentimentSum / totalSentimentCount) : 0;

    const officer = await User.findById(issue.assignedOfficer);
    if (!officer) return;

    let trustChange = 0;

    // Timeline Value Multiplier (Longer sustained quality = higher reward)
    let multiplier = 1;
    if (label === '1w') multiplier = 1.2;
    if (label === '1m') multiplier = 1.5;
    if (label === '3m') multiplier = 2.0;

    // Scoring Logic: Stars + Sentiment
    // Excellent: > 4.5 Stars OR (> 4 Stars AND > 0.5 Sentiment)
    if (avgStars >= 4.5 || (avgStars >= 4 && avgSentiment > 0.5)) {
        trustChange = 2 * multiplier;
    }
    // Poor: < 2.5 Stars OR (< 3 Stars AND < -0.5 Sentiment)
    else if (avgStars <= 2.5 || (avgStars <= 3 && avgSentiment < -0.5)) {
        trustChange = -5 * multiplier; // Heavy penalty
    }

    if (trustChange !== 0) {
        // Atomic Update to prevent race conditions
        await User.findByIdAndUpdate(officer._id, {
            $inc: { trustScore: Math.round(trustChange) }
        });

        // Notify Admin ONLY if this specific check caused a significant drop
        // (Avoid spamming if they were already penalized)
        if (trustChange <= -5) {
            await Notification.create({
                recipient: 'admin',
                title: `⚠️ Performance Alert (${label})`,
                message: `Officer ${officer.name} received poor ratings (${avgStars.toFixed(1)}⭐) on issue ${issue.complaintId}.`,
                type: 'warning',
                relatedId: issue._id
            });
        }
    }
};

const startFeedbackLoop = () => {
    // Run once on startup
    analyzeFeedbackLoop();

    // Run every 1 HOUR (Process lifecycle checks)
    // The user requested "only 5 times in a life of the issue".
    // Checking every hour is efficient enough to catch the 24h/3d/etc milestones 
    // without over-crawling. 10 mins was too aggressive.
    setInterval(analyzeFeedbackLoop, 60 * 60 * 1000);
};

module.exports = { startFeedbackLoop, analyzeSentiment }; // Export analyzeSentiment for real-time use too
