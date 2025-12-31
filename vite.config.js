import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            react(),
            {
                name: 'html-transform',
                transformIndexHtml(html) {
                    return html.replace(/%VITE_(.*?)%/g, (match, p1) => {
                        return env[`VITE_${p1}`] || '';
                    });
                },
            },
        ],
        server: {
            port: 3000,
            open: true,
            proxy: {
                '/api': {
                    target: 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        build: {
            outDir: 'build',
        },
    };
});
