import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
            full_url: `http://localhost:${process.env.VITE_PORT || 5173}`,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        hmr: false,
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
