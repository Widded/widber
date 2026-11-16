import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages proje sayfası için VITE_BASE_PATH=/berber/ verilir.
// Vercel/Netlify/Cloudflare Pages gibi kök alan adlarında varsayılan "/" kalır.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
