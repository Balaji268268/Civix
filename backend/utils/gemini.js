require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Array of 5 API keys provided by user (Moved to .env)
const API_KEYS = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
].filter(Boolean);

// STRICTLY User Supported Models Only
const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash",
    "gemma-3-27b-it"
];

let globalKeyIndex = 0;

const callGemini = async (prompt) => {
    if (API_KEYS.length === 0) {
        console.error("[AI] Critical: No API Keys found in .env");
        return null;
    }

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
                } else {
                    console.error(`[AI] Error: Key(${currentKeyIdx}) | ${modelName} -> ${error.message}`);
                }
                // Try next model/key
                continue;
            }
        }
    }

    console.error("[AI] Critical: All Keys and Models failed.");
    return null;
};

// Vision fallback
async function callGeminiVision(prompt, imageUrl) {
    if (API_KEYS.length === 0) return null;

    const axios = require('axios');
    const apiKey = API_KEYS[globalKeyIndex]; // Use current active key

    // Vision-capable models from user list? 
    // Gemini 2.5 Flash is usually multimodal.
    const visionModels = ["gemini-2.5-flash", "gemini-1.5-flash"];

    for (const model of visionModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
            console.error(`Vision Error (${model}):`, error.response?.data?.error?.message || error.message);
        }
    }
    return null;
}

module.exports = { callGemini, callGeminiVision };
