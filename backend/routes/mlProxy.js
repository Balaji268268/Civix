const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data'); // Might need this if we reconstruct, BUT we can try stream piping for files
const { verifyToken } = require('../middlewares/validate');

// Configure Multer for file uploads (to handle the incoming file locally before forwarding)
// Using memory storage to pass buffer to Python
const upload = multer({ storage: multer.memoryStorage() });

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://civix-ml.onrender.com' : 'http://localhost:8000');

// Proxy Handler for JSON requests
const proxyJson = async (req, res) => {
    try {
        // Construct URL: Remove /api/ml prefix, ensure no double slashes
        // If ML service is at root, we might want to strip /api too? 
        // Assuming ML Service has /generate-reply or /api/generate-reply. 
        // Let's keep /api mapping for now but be clean.
        const cleanPath = req.originalUrl.replace('/api/ml', '/api').replace('//', '/');
        const url = `${ML_SERVICE_URL}${cleanPath}`;
        console.log(`[ML Proxy] Proxying to: ${url}`);

        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("ML Proxy Error:", error.response?.data || error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: "ML Service unreachable" });
        }
    }
};

// Proxy Handler for Multipart/File requests (Transcribe)
const proxyMultipart = async (req, res) => {
    try {
        const cleanPath = req.originalUrl.replace('/api/ml', '/api').replace('//', '/');
        const url = `${ML_SERVICE_URL}${cleanPath}`;
        console.log(`[ML Proxy] Proxying File to: ${url}`);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const formData = new FormData();
        formData.append('audio', req.file.buffer, req.file.originalname);

        const response = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("ML File Proxy Error:", error.response?.data || error.message);
        res.status(500).json({ error: "ML Streaming failed" });
    }
};

// Routes
router.post('/analyze-toxicity', verifyToken, proxyJson);
router.post('/check-semantic-duplicate', verifyToken, proxyJson);
router.post('/generate-reply', verifyToken, proxyJson);
router.post('/predict-resolution-time', verifyToken, proxyJson);

// Special handling for file upload
// Assuming the Python endpoint is /transcribe-audio/
router.post('/transcribe-audio', verifyToken, upload.single('audio'), proxyMultipart);

module.exports = router;
