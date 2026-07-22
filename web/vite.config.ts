import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
    plugins: [react()],
    base: command === 'serve' ? '/' : '/creator_studio_app/dist/',
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0', // Listen on all network interfaces
        cors: true,      // Allow cross-origin from the Python backend
        hmr: {
            clientPort: 3000, // Ensure WebSocket connects on same port as HTTP
        },
        proxy: {
            '/api/v1': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
            },
            '/api/v1/calendar': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
            },
            '/api/youtube': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/youtube/, '/api/v1/youtube'),
            },
            '/api/drive': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
            },
            '/api/bundle': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/bundle/, '/api/v1/bundle'),
            },
            '/api/ansible': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/ansible/, '/api/v1/ansible'),
            },
            '/drive': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
            },
            '/dark_editor_v2': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            input: {
                index: './index.html',
            },
            output: {
                manualChunks: {
                    'vendor': ['react', 'react-dom'],
                    'query': ['@tanstack/react-query'],
                    'ui': ['clsx', 'tailwind-merge', 'class-variance-authority'],
                    'radix': ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tooltip']
                }
            }
        }
    }
}));
