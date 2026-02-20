import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
                ws: true,
                configure: (proxy) => {
                    proxy.on('error', (err) => console.log('proxy error', err));
                }
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
