// Smart API URL Detection
// Smart API URL Detection
const getApiUrl = () => {
    // 1. Explicit Env Var (Highest Priority)
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // 2. Runtime Detection
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // If we are NOT on localhost, assume Production (Render)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            console.log("Civix: Detected production environment, using Render backend.");
            return "https://civix-qau9.onrender.com";
        }
    }

    // 3. Localhost Fallback
    return "http://localhost:5000";
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
