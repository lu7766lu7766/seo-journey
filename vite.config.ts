import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

/**
 * Absolute site URL for og:image / twitter:image (share previews need absolute URLs).
 * Set SITE_URL yourself, or let Vercel's build env provide it; locally it stays empty (relative URL).
 */
const siteUrl = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : '')
).replace(/\/$/, '')

export default defineConfig({
  plugins: [react(), tailwindcss(), { name: 'site-url', transformIndexHtml: (html) => html.split('%SITE_URL%').join(siteUrl) }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
