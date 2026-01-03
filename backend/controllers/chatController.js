const Issue = require('../models/issues');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.chatHandler = async (req, res) => {
    try {
        const { message, userId } = req.body;

        // 1. Simple Regex for Issue Tracking
        // Matches: "status of #123", "track 123", "issue 66a...", "check #555"
        const trackRegex = /(?:status|track|check|issue|complaint).{0,10}?([a-fA-F0-9]{24}|#?(\d+))/i;
        const match = message.match(trackRegex);

        if (match) {
            let query;
            const idOrNumber = match[1].replace('#', '');

            // If it looks like a MongoID (24 hex chars)
            if (idOrNumber.length === 24) {
                query = { _id: idOrNumber };
            } else {
                // Assume it's a short sequence number (if you have one) or just fail gracefully 
                // For now, let's assume valid MongoID is needed OR we implement a counter field.
                // Let's assume the user might allow partial matching or we search by a custom 'ticketId' field if it existed.
                // Fallback: If strict mongoID is required, we tell them.
                // BUT, for user experience, let's search by 'title' text search if not an ID.
                query = null; // Reset if not a mongoId
            }

            if (query) {
                const issue = await Issue.findOne(query);
                if (issue) {
                    return res.status(200).json({
                        reply: `Found it! 🧐\n\n**${issue.title}**\nStatus: **${issue.status}**\nPriority: ${issue.priority}\n\nOur team is working on it!`
                    });
                }
            }
        }

        // 2. AI Fallback for General Questions & Contextual Tracking
        // We pass the "Issue Context" to Gemini if possible, or just general support.

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Prompt Engineering
        const systemPrompt = `
      You are CiviBot, a helpful AI assistant for the Civix platform.
      Your tone is friendly, professional, and slightly witty (Amazon support style).
      
      User Message: "${message}"
      
      Instructions:
      - If the user asks about app features (voting, reporting), explain them briefly.
      - If the user is angry/frustrated, apologize and offer to connect to a human agent.
      - If they ask for an issue status but didn't provide an ID, ask them for their 'Civix Issue ID' or 'Reference Number'.
      - Keep answers short (under 50 words).
    `;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ reply: "I'm having a little trouble connecting to the motherboard. 🤖 Try again in a bit!" });
    }
};
