import path from 'path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  server: {
    port: 5191,
  },
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@crm': path.resolve(__dirname, './src/components/crm'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
  build: {
    rollupOptions: {
      external: (id) =>
        id.includes('@prisma/client') || id.includes('generated/prisma'),
    },
  },
})
