// Smart API URL Detection - Updated 2026-01-04T17:25:00
const getApiUrl = () => {
    console.log("Civix Config Loaded: Build 2026-01-04-Priority-Update");

    // 1. Explicit Env Var (Highest Priority for Vercel Overrides)
    if (import.meta.env.VITE_BACKEND_URL) {
        console.log("Civix: Using Custom Env URL:", import.meta.env.VITE_BACKEND_URL);
        return import.meta.env.VITE_BACKEND_URL;
    }
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // 2. Production Detection (Fallbacks)
    if (import.meta.env.PROD) {
        console.log("Civix: Production mode detected. Using Default Render Backend.");
        return "https://civix-qau9.onrender.com";
    }

    // 3. Runtime Hostname (Fallback)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return "https://civix-qau9.onrender.com";
        }
    }

    // 4. Localhost Fallback
    return "http://localhost:5000";
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
