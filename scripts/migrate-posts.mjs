/**
 * One-shot migration: Jekyll `_posts/` -> Astro `src/content/posts/`.
 *
 * Run once, verify the report, then the old _posts/ directory can be deleted.
 * Kept in the repo as the audit trail for how the 2011-2015 archive was
 * transformed, since the transform is lossy in ways worth documenting.
 *
 *   node scripts/migrate-posts.mjs [--dry]
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import YAML from 'yaml'

const SRC = '_posts'
const OUT = 'src/content/posts'
const DRY = process.argv.includes('--dry')

/** Posts are Albanian if they use more than this many ë/ç characters. */
const ALBANIAN_DIACRITIC_THRESHOLD = 15
const DESC_MAX = 155
const DESC_MIN_BLOCK = 60

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Draft a meta description from the first substantive prose block.
 *
 * The old site let jekyll-seo-tag auto-extract this, which grabbed the first
 * heading and produced snippets like "Introduction / short history". We skip
 * heading blocks and anything too short to be a real sentence, then cut at a
 * sentence boundary where one exists so the snippet doesn't end mid-thought.
 */
function draftDescription(body) {
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  for (const block of blocks) {
    if (/^<h[1-6][\s>]/i.test(block)) continue // heading, not prose
    const text = decodeEntities(stripTags(block))
    if (text.length < DESC_MIN_BLOCK) continue // caption, link, or stray markup

    if (text.length <= DESC_MAX) return text

    // Prefer cutting at a sentence end inside the budget.
    const window = text.slice(0, DESC_MAX + 1)
    const sentenceEnd = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
    )
    if (sentenceEnd > DESC_MIN_BLOCK) return window.slice(0, sentenceEnd + 1).trim()

    // Otherwise cut at the last word boundary and mark it as truncated.
    return window.slice(0, window.lastIndexOf(' ')).trim() + '…'
  }
  return '' // caller flags this for manual authoring
}

/**
 * Demote every heading one level: h3->h4, h2->h3, h1->h2.
 *
 * 23 of the 35 posts carry raw <h1> tags from the WordPress export, one page
 * had ten of them. The page title is already the <h1>, so these are duplicates.
 * Processed high-to-low so a demoted h1 isn't demoted a second time as an h2.
 */
function demoteHeadings(body) {
  let out = body
  for (const level of [5, 4, 3, 2, 1]) {
    out = out
      .replace(new RegExp(`<h${level}(\\s[^>]*)?>`, 'gi'), (_m, attrs) => `<h${level + 1}${attrs ?? ''}>`)
      .replace(new RegExp(`</h${level}>`, 'gi'), `</h${level + 1}>`)
  }
  return out
}

const run = async () => {
  const files = (await readdir(SRC)).filter((f) => f.endsWith('.md')).sort()
  if (!DRY) await mkdir(OUT, { recursive: true })

  const report = []
  const slugs = new Map()

  for (const file of files) {
    const raw = await readFile(join(SRC, file), 'utf8')
    const { data, content } = matter(raw)

    // Recover titles truncated by an unquoted YAML comment.
    //
    // "title: BarCamp Prishtina #3" parses as "BarCamp Prishtina" because YAML
    // treats ` #` as a comment start. This has silently shipped on the live
    // site since the WordPress import — betimdrenica.com serves
    // "<title>BarCamp Prishtina</title>" today. Note "C# Express" is NOT
    // affected: a comment requires whitespace before the #.
    //
    // Narrow on purpose: only fires when the parsed title is a strict prefix
    // of the raw line and the dropped remainder begins with " #".
    const rawTitleLine = raw.split(/^---\s*$/m)[1]?.match(/^title:[ \t]*(.+?)[ \t]*$/m)?.[1]
    let recoveredTitle = null
    if (rawTitleLine && typeof data.title === 'string') {
      const unquoted = rawTitleLine.replace(/^(['"])(.*)\1$/, '$2')
      if (unquoted !== data.title && unquoted.startsWith(data.title) && /^\s+#/.test(unquoted.slice(data.title.length))) {
        recoveredTitle = unquoted
        data.title = unquoted
      }
    }

    const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
    if (slugs.has(slug)) throw new Error(`Duplicate slug "${slug}": ${file} vs ${slugs.get(slug)}`)
    slugs.set(slug, file)

    // --- body ---
    let body = content
    const moreCount = (body.match(/<!--\s*more\s*-->/gi) ?? []).length
    body = body.replace(/<!--\s*more\s*-->/gi, '')
    const h1Count = (body.match(/<h1[\s>]/gi) ?? []).length
    body = demoteHeadings(body)
    body = body.replace(/\n{3,}/g, '\n\n').trim() + '\n'

    // --- front matter ---
    const diacritics = (content.match(/[ëçËÇ]/g) ?? []).length
    const lang = diacritics > ALBANIAN_DIACRITIC_THRESHOLD ? 'sq' : 'en'

    // Jekyll dates are naive local strings ("2015-03-09 09:20") but were
    // rendered as UTC (+00:00), so pin them to UTC to keep dates identical.
    const rawDate = String(data.date ?? '').trim()
    const [datePart, timePart = '00:00'] = rawDate.split(/\s+/)
    const pubDate = `${datePart}T${timePart.length === 5 ? timePart : timePart.slice(0, 5)}:00Z`
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(pubDate)) {
      throw new Error(`Unparseable date in ${file}: "${rawDate}"`)
    }

    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : []

    const description = draftDescription(body)

    const frontmatter = {
      title: String(data.title).trim(),
      description,
      pubDate,
      lang,
      ...(tags.length ? { tags } : {}),
    }

    const out = `---\n${YAML.stringify(frontmatter).trim()}\n---\n\n${body}`
    if (!DRY) await writeFile(join(OUT, `${slug}.md`), out, 'utf8')

    report.push({
      file,
      slug,
      lang,
      h1Demoted: h1Count,
      moreStripped: moreCount,
      tags: tags.length,
      descLen: description.length,
      descMissing: description === '',
      title: frontmatter.title,
      description,
      pubDate,
      recoveredTitle,
    })
  }

  // --- console report ---
  console.log(`\nMigrated ${report.length} posts -> ${OUT}${DRY ? '  (DRY RUN)' : ''}\n`)
  console.log(
    ['slug'.padEnd(56), 'lang', 'h1→h2', 'more', 'tags', 'desc'].join('  '),
  )
  for (const r of report) {
    console.log(
      [
        r.slug.padEnd(56),
        r.lang.padEnd(4),
        String(r.h1Demoted).padStart(5),
        String(r.moreStripped).padStart(4),
        String(r.tags).padStart(4),
        r.descMissing ? ' MISSING' : String(r.descLen).padStart(4),
      ].join('  '),
    )
  }

  const missing = report.filter((r) => r.descMissing)
  console.log(`\n  ${report.filter((r) => r.lang === 'sq').length} Albanian / ${report.filter((r) => r.lang === 'en').length} English`)
  console.log(`  ${report.reduce((n, r) => n + r.h1Demoted, 0)} <h1> tags demoted to <h2>`)
  console.log(`  ${report.reduce((n, r) => n + r.moreStripped, 0)} <!--more--> markers stripped`)
  console.log(`  ${missing.length} descriptions need manual authoring${missing.length ? ': ' + missing.map((r) => r.slug).join(', ') : ''}`)

  const recovered = report.filter((r) => r.recoveredTitle)
  for (const r of recovered) {
    console.log(`  RECOVERED TITLE  ${r.slug}: "${r.recoveredTitle}"  (live site truncates this to a YAML comment)`)
  }

  // --- review file for the human pass ---
  if (!DRY) {
    const md = [
      '# Post descriptions — review pass',
      '',
      'Auto-drafted from each post\'s first substantive prose block. These are what',
      'Google shows as the search snippet and what appears on social shares.',
      '',
      'To change one, edit `description:` in the matching file under',
      '`src/content/posts/`. Aim for one clear sentence under 155 characters.',
      '',
      `Generated for ${report.length} posts.`,
      '',
      ...report.flatMap((r) => [
        `### ${r.title}`,
        `\`src/content/posts/${r.slug}.md\` · ${r.pubDate.slice(0, 10)} · ${r.lang}`,
        '',
        r.descMissing ? '> **NEEDS WRITING — no prose block found**' : `> ${r.description}`,
        '',
      ]),
    ].join('\n')
    await writeFile('DESCRIPTIONS-REVIEW.md', md, 'utf8')
    console.log('\n  Wrote DESCRIPTIONS-REVIEW.md')
  }
}

run().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
