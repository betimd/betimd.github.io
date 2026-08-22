/**
 * Post-build assertions against dist/.
 *
 * Every check here corresponds to a defect that actually shipped on the old
 * site. They are assertions rather than a checklist because the whole class of
 * bug being fixed — a relative canonical, an empty description — is invisible
 * on a rendered page and can only be caught mechanically.
 *
 *   pnpm build && pnpm verify
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'
const ORIGIN = 'https://betimdrenica.com'

let failures = 0
let checks = 0

const ok = (msg) => {
  checks++
  console.log(`  [32mPASS[0m  ${msg}`)
}
const fail = (msg, detail) => {
  checks++
  failures++
  console.log(`  [31mFAIL[0m  ${msg}`)
  if (detail) String(detail).split('\n').slice(0, 12).forEach((l) => console.log(`          ${l}`))
}
const assert = (cond, msg, detail) => (cond ? ok(msg) : fail(msg, detail))

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

const exists = async (p) => {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

const run = async () => {
  if (!(await exists(DIST))) {
    console.error('dist/ not found — run `pnpm build` first.')
    process.exit(1)
  }

  const all = await walk(DIST)
  const html = all.filter((f) => f.endsWith('.html'))
  const pages = new Map()
  for (const f of html) pages.set(relative(DIST, f).split(sep).join('/'), await readFile(f, 'utf8'))

  const isStub = (src) => src.includes('http-equiv="refresh"')
  const realPages = [...pages].filter(([, src]) => !isStub(src))
  const stubPages = [...pages].filter(([, src]) => isStub(src))

  console.log(`\nVerifying ${pages.size} HTML files in dist/ (${realPages.length} pages, ${stubPages.length} redirect stubs)\n`)

  // ---- routes ----
  console.log('Routes')
  const postFiles = (await readdir('src/content/posts')).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  const expected = postFiles.length

  const flat = [...pages.keys()].filter((p) => !p.includes('/') && p.endsWith('.html'))
  const dated = [...pages.keys()].filter((p) => /^\d{4}\/\d{2}\/\d{2}\/.+\.html$/.test(p))

  assert(dated.length === expected, `${expected} dated redirect stubs generated`, `found ${dated.length}`)

  const missing = postFiles
    .map((f) => f.replace(/\.md$/, '.html'))
    .filter((f) => !pages.has(f))
  assert(missing.length === 0, `all ${expected} posts have a flat /slug.html page`, missing.join('\n'))

  // Every stub must point at a file that exists.
  const danglingStubs = []
  for (const [path, src] of stubPages) {
    const target = src.match(/rel="canonical"\s+href="([^"]+)"/)?.[1]
    if (!target) {
      danglingStubs.push(`${path}: no canonical`)
      continue
    }
    const rel = target.replace(ORIGIN, '').replace(/^\//, '')
    if (!pages.has(rel)) danglingStubs.push(`${path} -> ${target}`)
  }
  assert(danglingStubs.length === 0, 'every redirect stub targets a real page', danglingStubs.join('\n'))

  assert(pages.has('about/index.html'), 'old /about/ URL has a stub at about/index.html')

  // ---- SEO ----
  console.log('\nSEO')
  const relCanonical = []
  const relOg = []
  const badH1 = []
  const noDesc = []
  const descs = new Map()
  const badJsonLd = []

  for (const [path, src] of realPages) {
    const canonical = src.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
    if (!canonical || !canonical.startsWith(ORIGIN)) relCanonical.push(`${path}: ${canonical ?? 'MISSING'}`)

    const og = src.match(/<meta property="og:url" content="([^"]*)"/)?.[1]
    if (!og || !og.startsWith(ORIGIN)) relOg.push(`${path}: ${og ?? 'MISSING'}`)

    const h1s = (src.match(/<h1[\s>]/gi) ?? []).length
    if (h1s !== 1) badH1.push(`${path}: ${h1s} <h1>`)

    const desc = src.match(/<meta name="description" content="([^"]*)"/)?.[1]
    if (!desc || !desc.trim()) noDesc.push(path)
    else descs.set(path, desc)

    for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1])
      } catch (e) {
        badJsonLd.push(`${path}: ${e.message}`)
      }
    }
  }

  assert(relCanonical.length === 0, 'every canonical is absolute', relCanonical.join('\n'))
  assert(relOg.length === 0, 'every og:url is absolute (Open Graph requires it)', relOg.join('\n'))
  assert(badH1.length === 0, 'exactly one <h1> per page', badH1.join('\n'))
  assert(noDesc.length === 0, 'every page has a non-empty meta description', noDesc.join('\n'))
  assert(badJsonLd.length === 0, 'all JSON-LD parses', badJsonLd.join('\n'))

  // Duplicate descriptions are a real ranking problem, but stubs legitimately share none.
  const byDesc = new Map()
  for (const [p, d] of descs) byDesc.set(d, [...(byDesc.get(d) ?? []), p])
  const dupes = [...byDesc].filter(([, ps]) => ps.length > 1)
  assert(dupes.length === 0, 'no two pages share a meta description', dupes.map(([d, ps]) => `${ps.join(', ')}\n  "${d.slice(0, 70)}..."`).join('\n'))

  const placeholder = [...pages].filter(([, s]) => s.includes('Write an awesome description'))
  assert(placeholder.length === 0, 'the Jekyll placeholder description is gone', placeholder.map(([p]) => p).join('\n'))

  const sq = realPages.filter(([, s]) => /<html lang="sq"/.test(s))
  assert(sq.length === 16, '16 Albanian posts carry lang="sq"', `found ${sq.length}`)

  // ---- files ----
  console.log('\nFiles')
  assert(await exists(join(DIST, 'CNAME')), 'CNAME present in dist/ (custom domain survives deploy)')
  if (await exists(join(DIST, 'CNAME'))) {
    const cname = (await readFile(join(DIST, 'CNAME'), 'utf8')).trim()
    assert(cname === 'betimdrenica.com', `CNAME contains betimdrenica.com`, `got "${cname}"`)
  }
  assert(await exists(join(DIST, 'robots.txt')), 'robots.txt present (was 404 on the old site)')
  assert(await exists(join(DIST, 'sitemap-index.xml')), 'sitemap-index.xml present (was 404 on the old site)')
  assert(await exists(join(DIST, '404.html')), '404.html present')

  // ---- feed ----
  console.log('\nFeed')
  const feedPath = join(DIST, 'feed.xml')
  if (await exists(feedPath)) {
    const feed = await readFile(feedPath, 'utf8')
    const items = (feed.match(/<item>/g) ?? []).length
    ok('feed.xml served at its original path (subscribers preserved)')
    assert(items === expected, `feed contains all ${expected} posts`, `found ${items}`)
    assert(feed.includes(`<link>${ORIGIN}/`), 'feed links are absolute')
  } else {
    fail('feed.xml present at /feed.xml')
  }

  // ---- dead images ----
  console.log('\nDead resources')
  // Match the host only as a URL authority (//host), never as a bare
  // substring — recovered files are named after their origin host, e.g.
  // /assets/images/external/fbcdn-sphotos-a-a.akamaihd.net-562379.jpg, and a
  // substring match flags those local paths as if they were remote hotlinks.
  const deadHosts = ['blog.betimdrenica.com', 'fbcdn-sphotos', 'encrypted-tbn', 'snac.nokia.com']
  for (const host of deadHosts) {
    const re = new RegExp(`//[^"'\\s/]*${host.replace(/\./g, '\\.')}`, 'g')
    const hits = [...pages].filter(([, s]) => re.test(s))
    const detail = hits.slice(0, 8).map(([p, s]) => `${p} (${(s.match(re) ?? []).length})`)
    assert(hits.length === 0, `no remote references to ${host}`, detail.join('\n'))
  }

  console.log(`\n${failures === 0 ? '[32m' : '[31m'}${checks - failures}/${checks} checks passed[0m\n`)
  process.exit(failures === 0 ? 0 : 1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
