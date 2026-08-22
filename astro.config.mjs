// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  // The single most important line in this file.
  //
  // The previous Jekyll site left `url: ''` in _config.yml, which made
  // jekyll-seo-tag emit relative canonicals, a relative og:url, and relative
  // JSON-LD @id values across all 36 pages. Open Graph *requires* absolute
  // URLs, so every social share preview was broken. Everything in Seo.astro
  // resolves against this value via `new URL(path, Astro.site)`.
  site: 'https://betimdrenica.com',

  // Emit /slug.html rather than the default /slug/index.html.
  // This gives the flat paulgraham.com-style URLs, and makes the dated
  // redirect stubs land at /2015/03/09/foo.html instead of
  // /2015/03/09/foo.html/index.html.
  build: { format: 'file' },

  // No `base` — required when serving GitHub Pages from a custom domain.

  integrations: [sitemap()],

  markdown: {
    // Posts are WordPress exports containing hand-written 2011-era HTML.
    // Keep it as-is; see scripts/migrate-posts.mjs for why we don't convert.
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: 'github-light', wrap: true },
  },
})
