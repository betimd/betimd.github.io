/**
 * One-shot: localise every externally-hosted image referenced by the posts.
 *
 * The 2011-2015 archive hot-links images from hosts that are now dead —
 * chiefly blog.betimdrenica.com, whose DNS record no longer resolves at all,
 * plus expired Facebook CDN and Google thumbnail URLs. Practically every image
 * on the live site is a broken icon today.
 *
 * For each distinct image:
 *   1. try the origin directly (a few third-party hosts are still alive)
 *   2. fall back to the newest HTTP-200 Wayback Machine snapshot
 *   3. otherwise classify it — and NEVER conflate a transport error with a
 *      genuine "not archived" result. An earlier version of this script did
 *      exactly that, and a rate-limited run reported every image as
 *      unrecoverable when most were merely slow to fetch.
 *
 * Everything recovered is committed under public/assets/images/, so the site
 * ends up with zero external image dependencies.
 *
 *   node scripts/recover-images.mjs [--dry] [--only=<substring>]
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'

const POSTS = 'src/content/posts'
const OUT_DIR = 'public/assets/images'
const PUBLIC_PREFIX = '/assets/images'
const DRY = process.argv.includes('--dry')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)

/** archive.org throttles aggressively; this pacing survived a full run. */
const ARCHIVE_DELAY_MS = 1500
const CDX_TIMEOUT_MS = 60_000
const SNAP_TIMEOUT_MS = 60_000
const ORIGIN_TIMEOUT_MS = 15_000
const MAX_ATTEMPTS = 3

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Resolves to a Response, or throws. Callers must distinguish throw from !ok. */
async function fetchWithTimeout(url, timeoutMs) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: ac.signal, redirect: 'follow' })
  } finally {
    clearTimeout(t)
  }
}

const IMG_SRC = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi
const A_HREF = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i

const isExternal = (u) => /^https?:\/\//i.test(u)
const stripQuery = (u) => u.split('?')[0].split('#')[0]

/**
 * Alternate origins to try before falling back to the Wayback Machine.
 *
 * The `?w=300` query params in the imported markup are WordPress.com's Photon
 * signature: blog.betimdrenica.com was only ever a custom-domain alias for a
 * WordPress.com blog. The domain mapping lapsed and its DNS record is gone,
 * but betimdrenica.wordpress.com is still live and still serving every upload
 * at the identical /wp-content/uploads/YYYY/MM/ path — at full resolution,
 * with no rate limiting.
 *
 * The Wayback Machine only has ~8 of these images, so without this the
 * recovery rate would have been about 13%.
 */
function mirrorsFor(url) {
  const out = []
  if (/^https?:\/\/blog\.betimdrenica\.com\//i.test(url)) {
    out.push(url.replace(/^https?:\/\/blog\.betimdrenica\.com\//i, 'https://betimdrenica.wordpress.com/'))
  }
  return out
}

function localPathFor(url) {
  const clean = stripQuery(url)
  let name = decodeURIComponent(basename(clean)) || 'image'
  name = name.replace(/[^A-Za-z0-9._-]/g, '-')
  if (!extname(name)) name += '.png'

  const wp = clean.match(/\/uploads\/(\d{4})\/(\d{2})\//)
  if (wp) return `${wp[1]}/${name}`

  let host = 'external'
  try {
    host = new URL(clean).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '')
  } catch {}
  return `external/${host}-${name}`
}

/** @returns {{buf:Buffer, via:string} | null} null means a clean negative. */
async function tryOrigin(url) {
  try {
    const res = await fetchWithTimeout(url, ORIGIN_TIMEOUT_MS)
    if (!res.ok) return null
    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.byteLength ? { buf, via: 'origin' } : null
  } catch {
    // DNS failure / timeout. For these hosts that's expected, not noteworthy.
    return null
  }
}

/**
 * Query the CDX index.
 * @returns {{ok:true, timestamps:string[]} | {ok:false, reason:string}}
 * The discriminated result is the whole point: `ok:true, timestamps:[]` means
 * "definitively not archived", while `ok:false` means "we could not find out".
 */
async function cdxLookup(url) {
  const endpoint =
    'https://web.archive.org/cdx/search/cdx?url=' +
    encodeURIComponent(url) +
    '&fl=timestamp&filter=statuscode:200&collapse=digest&limit=-8'

  let lastReason = 'unknown'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(endpoint, CDX_TIMEOUT_MS)
      if (res.status === 429 || res.status === 503) {
        lastReason = `http ${res.status}`
        await sleep(ARCHIVE_DELAY_MS * attempt * 4) // back off hard on throttling
        continue
      }
      if (!res.ok) {
        lastReason = `http ${res.status}`
        await sleep(ARCHIVE_DELAY_MS * attempt)
        continue
      }
      const timestamps = (await res.text())
        .trim()
        .split('\n')
        .map((l) => l.trim().split(/\s+/)[0])
        .filter((t) => /^\d{14}$/.test(t))
      return { ok: true, timestamps }
    } catch (err) {
      lastReason = err.name === 'AbortError' ? 'timeout' : err.message
      await sleep(ARCHIVE_DELAY_MS * attempt * 2)
    }
  }
  return { ok: false, reason: lastReason }
}

/** @returns {{buf,via} | {notArchived:true} | {error:string}} */
async function tryWayback(url) {
  const lookup = await cdxLookup(url)
  await sleep(ARCHIVE_DELAY_MS)

  if (!lookup.ok) return { error: `cdx ${lookup.reason}` }
  if (!lookup.timestamps.length) return { notArchived: true }

  let lastError = null
  for (const ts of [...lookup.timestamps].reverse()) {
    // `id_` returns the original bytes, without Wayback's HTML wrapper/toolbar.
    const snap = `https://web.archive.org/web/${ts}id_/${url}`
    try {
      const res = await fetchWithTimeout(snap, SNAP_TIMEOUT_MS)
      await sleep(ARCHIVE_DELAY_MS)
      if (!res.ok) {
        lastError = `snapshot http ${res.status}`
        continue
      }
      if (!(res.headers.get('content-type') ?? '').startsWith('image/')) {
        lastError = 'snapshot not an image'
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.byteLength) return { buf, via: `wayback:${ts}` }
      lastError = 'snapshot empty'
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'snapshot timeout' : err.message
      await sleep(ARCHIVE_DELAY_MS)
    }
  }
  return { error: lastError ?? 'all snapshots failed' }
}

const run = async () => {
  const files = (await readdir(POSTS)).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()

  // --- pass 1: collect refs, grouped by query-stripped URL ---
  // ria-1.png and ria-1.png?w=300 are the same underlying file; fetching once
  // halves the request count against an already-throttling archive.
  const groups = new Map() // strippedUrl -> { variants:Set, posts:Set }
  const sources = new Map()

  for (const file of files) {
    const text = await readFile(join(POSTS, file), 'utf8')
    sources.set(file, text)
    const refs = new Set()
    for (const m of text.matchAll(IMG_SRC)) refs.add(m[1])
    for (const m of text.matchAll(A_HREF)) if (IMAGE_EXT.test(stripQuery(m[1]))) refs.add(m[1])

    for (const ref of refs) {
      if (!isExternal(ref)) continue
      const key = stripQuery(ref)
      if (!groups.has(key)) groups.set(key, { variants: new Set(), posts: new Set() })
      groups.get(key).variants.add(ref)
      groups.get(key).posts.add(file)
    }
  }

  let keys = [...groups.keys()].sort()
  if (ONLY) keys = keys.filter((k) => k.includes(ONLY))

  const totalRefs = [...groups.values()].reduce((n, g) => n + g.variants.size, 0)
  console.log(`\n${totalRefs} external refs -> ${keys.length} distinct images across ${files.length} posts.\n`)

  // --- pass 2: fetch ---
  const resolved = new Map() // any variant url -> public path
  const notArchived = []
  const errored = []
  const written = new Set()
  let n = 0

  for (const key of keys) {
    n++
    const { variants, posts } = groups.get(key)
    console.log(`  [${String(n).padStart(2)}/${keys.length}] ${key.length > 92 ? key.slice(0, 89) + '...' : key}`)

    // 1. the URL as written  2. known live mirrors  3. the Wayback Machine
    let got = await tryOrigin(key)
    for (const mirror of mirrorsFor(key)) {
      if (got) break
      const hit = await tryOrigin(mirror)
      if (hit) got = { ...hit, via: 'mirror' }
    }
    let outcome = got ? null : await tryWayback(key)
    if (!got && outcome && 'buf' in outcome) got = outcome

    if (got) {
      const rel = localPathFor(key)
      if (!DRY && !written.has(rel)) {
        await mkdir(join(OUT_DIR, dirname(rel)), { recursive: true })
        await writeFile(join(OUT_DIR, rel), got.buf)
        written.add(rel)
      }
      for (const v of variants) resolved.set(v, `${PUBLIC_PREFIX}/${rel}`)
      console.log(`           ok   ${got.via}  ${(got.buf.byteLength / 1024).toFixed(0)} KB  -> ${PUBLIC_PREFIX}/${rel}`)
    } else if (outcome?.notArchived) {
      notArchived.push({ url: key, posts: [...posts] })
      console.log(`           gone  not archived`)
    } else {
      errored.push({ url: key, posts: [...posts], reason: outcome?.error ?? 'unknown' })
      console.log(`           ERR   ${outcome?.error ?? 'unknown'}  (retryable — NOT counted as lost)`)
    }
  }

  // --- pass 3: rewrite ---
  let rewrites = 0
  for (const [file, original] of sources) {
    let text = original
    for (const [url, local] of resolved) {
      const parts = text.split(url)
      if (parts.length > 1) {
        rewrites += parts.length - 1
        text = parts.join(local)
      }
    }
    if (text !== original && !DRY) await writeFile(join(POSTS, file), text, 'utf8')
  }

  // --- report ---
  console.log(`\n  recovered      ${resolved.size} refs / ${written.size} files`)
  console.log(`  not archived   ${notArchived.length}`)
  console.log(`  errored        ${errored.length}${errored.length ? '   <- re-run to retry these' : ''}`)
  console.log(`  rewrites       ${rewrites}`)

  if (!DRY) {
    const md = [
      '# Image recovery report',
      '',
      `${totalRefs} external references across ${files.length} posts, resolving to ${keys.length} distinct images.`,
      '',
      `- **Recovered:** ${written.size} files (${resolved.size} references rewritten)`,
      `- **Not archived:** ${notArchived.length}`,
      `- **Errored (retryable):** ${errored.length}`,
      '',
      'Recovered images are committed under `public/assets/images/`. The site has',
      'no remaining external image dependencies for these.',
      '',
      '## Not archived',
      '',
      'The Wayback Machine has no HTTP-200 capture of these. The originals are',
      'almost certainly gone for good — `blog.betimdrenica.com` no longer resolves.',
      '',
      notArchived.length
        ? notArchived.map((l) => `- \`${l.url}\`\n  - in: ${l.posts.map((p) => `\`${p}\``).join(', ')}`).join('\n')
        : '_None._',
      '',
      '## Errored',
      '',
      'Transport failures, not confirmed absences. Re-run the script to retry.',
      '',
      errored.length
        ? errored.map((l) => `- \`${l.url}\` — ${l.reason}\n  - in: ${l.posts.map((p) => `\`${p}\``).join(', ')}`).join('\n')
        : '_None._',
      '',
    ].join('\n')
    await writeFile('IMAGE-RECOVERY-REPORT.md', md, 'utf8')
    console.log('\n  Wrote IMAGE-RECOVERY-REPORT.md')
  }
}

run().catch((err) => {
  console.error('\nRecovery failed:', err.message)
  process.exit(1)
})
