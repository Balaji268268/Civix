// Smart API URL Detection
const getApiUrl = () => {
    // 1. Explicit Env Var (Vercel/Local)
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // 2. Production Fallback (if running on Vercel but missing env var)
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        return "https://civix-qau9.onrender.com";
    }

    // 3. Localhost Fallback
    return "http://localhost:5000";
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
