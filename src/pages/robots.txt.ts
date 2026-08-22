import type { APIRoute } from 'astro'

// The previous site returned 404 for /robots.txt and had no sitemap at all.
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
