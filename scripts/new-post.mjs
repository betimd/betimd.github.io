/**
 * Create a new post with the front matter pre-filled.
 *
 *   pnpm new-post "Why I built Sent"
 *   pnpm new-post "Something in Albanian" --lang=sq
 *   pnpm new-post "Not ready yet" --draft
 *
 * The filename becomes the URL, so choose the title carefully — renaming a
 * published post breaks its link and any inbound reference to it.
 */
import { writeFile, access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const POSTS = 'src/content/posts'

const args = process.argv.slice(2)
const title = args.find((a) => !a.startsWith('--'))
const lang = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'en'
const draft = args.includes('--draft')

if (!title) {
  console.error('Usage: pnpm new-post "Post title" [--lang=sq] [--draft]')
  process.exit(1)
}

/** Latin-1 folding keeps Albanian titles (ë, ç) producing clean ASCII slugs. */
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const slug = slugify(title)
if (!slug) {
  console.error(`Could not derive a slug from "${title}".`)
  process.exit(1)
}

const file = join(POSTS, `${slug}.md`)
try {
  await access(file)
  console.error(`Refusing to overwrite an existing post: ${file}`)
  process.exit(1)
} catch {
  /* does not exist — good */
}

// Seconds precision, UTC, matching the migrated archive.
const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const yamlTitle = /[:#"']/.test(title) ? JSON.stringify(title) : title

const body = `---
title: ${yamlTitle}
description: ${draft ? 'TODO — one sentence. This is your Google snippet.' : 'TODO — one sentence. This is your Google snippet.'}
pubDate: ${now}
lang: ${lang}
${draft ? 'draft: true\n' : ''}---

Write here.
`

await mkdir(POSTS, { recursive: true })
await writeFile(file, body, 'utf8')

console.log(`\n  ${file}`)
console.log(`  -> https://betimdrenica.com/${slug}.html\n`)
console.log('  Fill in `description` before building — it is required and')
console.log('  the build will fail with this filename if it is left empty.\n')
