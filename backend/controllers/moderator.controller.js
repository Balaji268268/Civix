const { callGemini } = require('../utils/gemini');
const Issue = require('../models/issues');

/**
 * Analyzes an issue for Priority, Fake/Spam, and Categorization using Gemini.
 */
const analyzeIssue = async (req, res) => {
    try {
        const { title, description, issueId } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: "Title and Description are required" });
        }

        // Check persistence first
        if (issueId) {
            const issue = await Issue.findById(issueId);
            if (issue && issue.aiAnalysis && issue.aiAnalysis.priority) {
                // BUG FIX: Ensure 'isAnalyzed' is set to true even for cached results 
                if (!issue.isAnalyzed) {
                    issue.isAnalyzed = true;
                    // Also auto-shift category if missed previously
                    if (issue.aiAnalysis.category && issue.category === 'General') {
                        issue.category = issue.aiAnalysis.category;
                    }
                    await issue.save();
                }
                return res.json(issue.aiAnalysis);
            }
        }

        // fallback if no key (Should be rarely hit now with 5 keys)
        // Leaving logic in case all 5 fail
        // ... (existing key check removed as it's handled in utils/gemini.js now mostly, 
        // but we can leave a safety check if we want, but better to trust the util)

        const prompt = `
      Analyze the following civic issue report:
      Title: "${title}"
      Description: "${description}"

      Tasks:
      1. Classify Priority (High, Medium, Low). High = Danger to life/safety.
      2. Detect if Fake/Spam/Gibberish. (true/false).
      3. Confidence Score for Fake detection (0.0 to 1.0).
      4. Suggest a Category (Sanitation, Roads, Electricity, Police, Fire, Transport, Other).
      5. Provide verified reasoning (max 1 sentence).

      Output JSON format ONLY:
      {
        "priority": "High/Medium/Low",
        "isFake": boolean,
        "fakeConfidence": number,
        "category": "String",
        "reasoning": "String"
      }
    `;

        const rawResponse = await callGemini(prompt);

        if (!rawResponse) {
            throw new Error("AI Service Unavailable");
        }

        // Clean markdown code blocks if present
        const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanJson);

        // Save to DB if issueId provided
        if (issueId) {
            await Issue.findByIdAndUpdate(issueId, {
                category: analysis.category, // Auto-apply AI category to root
                isAnalyzed: true,
                aiAnalysis: { ...analysis, analyzedAt: new Date() }
            });
        }

        res.json(analysis);

    } catch (error) {
        console.error("Analysis Failed:", error);
        res.status(500).json({ message: "Analysis Failed", error: error.message });
    }
};

/**
 * Detects semantic duplicates using Gemini.
 * Compares the target issue against a list of recent issues.
 */
const detectDuplicates = async (req, res) => {
    try {
        const { title, description, issueId } = req.body;

        // 1. Persistence Check
        if (issueId) {
            const issue = await Issue.findById(issueId);
            if (issue && issue.duplicateAnalysis && issue.duplicateAnalysis.confidence !== undefined) {
                // console.log("Twice check skipped (cached):", issueId);
                return res.json(issue.duplicateAnalysis);
            }
        }

        // In real app: Fetch last 50 issues from DB
        // const recentIssues = await Issue.find().select('title description').limit(50);

        // Mocking Reference Data for Demo
        const referenceIssues = [
            { id: 101, title: "Street light not working in Sector 4" },
            { id: 102, title: "Garbage overflow at main market" },
            { id: 103, title: "Pothole near central park" },
            { id: 104, title: "Water leakage in pipeline" }
        ];

        // fallback logic handled in utils now

        const prompt = `
          I have a new issue report:
          Title: "${title}"
          Description: "${description}"

          Compare it against these existing issues:
          ${JSON.stringify(referenceIssues)}

          Task:
          1. Identify if this new issue is a semantic duplicate of any existing issue.
          2. Return the ID of the most similar issue.
          3. confidence score (0-1).

          Output JSON ONLY:
          {
             "isDuplicate": boolean,
             "similarId": number | null,
             "confidence": number,
             "reasoning": "String"
          }
        `;

        const rawResponse = await callGemini(prompt);
        if (!rawResponse) throw new Error("AI Service Unavailable");

        const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        // 2. Save Result
        if (issueId) {
            await Issue.findByIdAndUpdate(issueId, {
                duplicateAnalysis: { ...result, analyzedAt: new Date() }
            });
        }

        res.json(result);

    } catch (error) {
        console.error("Duplicate Check Failed:", error);
        res.status(500).json({ message: "Duplicate Check Failed" });
    }
};

/**
 * Extracts community insights from recent issues.
 */
const getCommunityInsights = async (req, res) => {
    try {
        // In a real app, fetch last 20 issues from DB
        // const recentIssues = await Issue.find().sort({ createdAt: -1 }).limit(20);
        // For now, prompt generic insights or assume req.body has text

        // Mocking fetching text from DB for the prompt
        // const texts = recentIssues.map(i => i.title).join(". ");

        const prompt = `
      Summarize the common complaints in a city based on typical trends: "Potholes, Water Shortage, Traffic".
      Generate a "Weekly Insight" report with:
      Summarize the civic issues trends.
      Generate data for advanced visualizations:
      1. Trends: List of topics and their frequency (Top 5).
      2. Sentiment: A score from 0 (Negative) to 100 (Positive) over the last 7 days (mock data).
      3. Actionable Suggestion.

      Output JSON format ONLY:
      {
        "trendingTopics": [ {"topic": "Potholes", "count": 15}, {"topic": "Water", "count": 10} ],
        "sentimentScore": 45,
        "sentimentTrend": [40, 42, 38, 45, 48, 45, 50],
        "suggestion": "Detailed AI suggestion here..."
      }
      
      Output JSON format ONLY:
      {
        "trendingTopics": ["Topic 1", "Topic 2"],
        "sentiment": "String",
        "suggestion": "String"
      }
    `;

        const rawResponse = await callGemini(prompt);

        if (!rawResponse) throw new Error("AI Service Unavailable");

        const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const insights = JSON.parse(cleanJson);

        res.json(insights);
    } catch (error) {
        res.status(500).json({ message: "Insight Generation Failed" });
    }
};

module.exports = { analyzeIssue, getCommunityInsights, detectDuplicates };
