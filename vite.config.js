import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
