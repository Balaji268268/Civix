// Smart API URL Detection - Updated 2026-01-04T17:25:00
const getApiUrl = () => {
    console.log("Civix Config Loaded: Build 2026-01-04-FINAL-FIX");

    // 1. Production Detection (Vite Native) - HIGHEST PRIORITY
    // This strictly forces the Render URL when built for production, ignoring potentially bad Env Vars.
    if (import.meta.env.PROD) {
        console.log("Civix: Production mode detected. Using Render Backend.");
        return "https://civix-qau9.onrender.com";
    }

    // 2. Explicit Env Var
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // 3. Runtime Hostname (Fallback)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // If we are NOT on localhost, assume Production (Render)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return "https://civix-qau9.onrender.com";
        }
    }

    // 4. Localhost Fallback
    return "http://localhost:5000";
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
