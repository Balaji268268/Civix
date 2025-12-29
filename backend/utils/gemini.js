const { GoogleGenerativeAI } = require("@google/generative-ai");

// Array of 5 API keys provided by user (Moved to .env)
const API_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(Boolean);

// Top 5 Models (Efficiency & Reasoning)
// Using standard identifiers based on user input, assuming they map to API model names
const MODELS = [
    "gemini-2.0-flash",       // Adjusted to likely real version or user's 2.5 if valid
    "gemini-1.5-flash",       // Stable fallback
    "gemini-1.5-pro",         // High reasoning
    "gemini-pro",             // Legacy stable
    "gemini-1.5-flash-8b"     // Speed
];
// NOTE: User asked for "gemini-2.5-flash". 
// Since 2.5 is futuristic (as of 2024 cutoff), but context is Dec 2025:
// I will use his exact strings.
const USER_MODELS = [
    "gemini-2.5-flash",
    "gemini-3-flash",
    "gemini-2.5-flash-lite",
    "gemma-2-27b-it", // Correcting gemma convention usually allows 'gemma-2' or similar. 
    // I'll stick to what user said mostly but ensure reliability.
    "gemini-2.0-flash-exp" // backup
];

// Let's use PRECISELY what user listed as available in their "quota" dump to be safe.
const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-27b",
    "gemma-3-12b"
];

let globalKeyIndex = 0;

const callGemini = async (prompt) => {
    // Outer Loop: Keys
    for (let k = 0; k < API_KEYS.length; k++) {
        const currentKeyIdx = (globalKeyIndex + k) % API_KEYS.length;
        const apiKey = API_KEYS[currentKeyIdx];

        // Inner Loop: Models
        for (const modelName of ACTIVE_MODELS) {
            try {
                // console.log(`[AI] Attempt: Key(${currentKeyIdx}) | Model: ${modelName}`);
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Success! Stick with this key for next time (optimization)
                globalKeyIndex = currentKeyIdx;
                return text;

            } catch (error) {
                const msg = error.message.toLowerCase();
                const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');

                if (isQuota) {
                    // console.warn(`[AI] Quota: Key(${currentKeyIdx}) | ${modelName} -> next model...`);
                    continue; // Try next model
                } else {
                    // console.error(`[AI] Error: Key(${currentKeyIdx}) | ${modelName} -> ${msg}`);
                    // For non-quota errors (e.g., model not found), also try next model
                    continue;
                }
            }
        }
        // console.warn(`[AI] Key(${currentKeyIdx}) exhausted all models. Switching key.`);
    }

    console.error("[AI] Critical: All Keys and Models failed.");
    return null;
};

// Simple vision fallback (using first key for now, or similar rotation if needed)
async function callGeminiVision(prompt, imageUrl) {
    const axios = require('axios');
    const apiKey = API_KEYS[globalKeyIndex]; // Use current active key

    // Fallback to flash for vision
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const mimeType = imageResponse.headers['content-type'];

        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Image } }
                ]
            }]
        }, { headers: { 'Content-Type': 'application/json' } });

        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.error("Vision Error:", error.message);
        return null;
    }
}

module.exports = { callGemini, callGeminiVision };
