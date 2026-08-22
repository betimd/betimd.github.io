# betimdrenica.com

Personal site and writing archive. Astro, static, no JavaScript shipped to the
browser. Deployed to GitHub Pages from `master` via GitHub Actions.

## Writing a new post

```bash
pnpm new-post "Why I built Sent"
```

That creates `src/content/posts/why-i-built-sent.md` with the front matter
filled in. Write, then commit and push — Actions builds and deploys.

A post is just a Markdown file:

```markdown
---
title: Why I built Sent
description: One sentence. This is your Google snippet and social card text.
pubDate: 2026-08-22T09:00:00Z
lang: en
---

Every messaging API I tried made the simple case hard...
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Quote it if it contains `:` or a leading `#` |
| `description` | **yes** | Build **fails** without it — see below |
| `pubDate` | yes | ISO 8601, UTC |
| `lang` | no | `en` (default) or `sq`; sets `<html lang>` |
| `tags` | no | Stored, not rendered anywhere |
| `draft` | no | `true` excludes it from the build |
| `image` | no | Path under `/public`, used for `og:image` |

**`description` is deliberately required.** The previous Jekyll site left it to
be auto-extracted, which shipped snippets like *"Introduction / short history"*
across the whole archive — and left the scaffold placeholder *"Write an awesome
description for your new site here"* as the homepage's Google result for years.
A missing description is now a build error naming the file, not a silent defect.

### The filename is the URL

`why-i-built-sent.md` is served at `/why-i-built-sent.html`. Renaming a
published post breaks its link and any inbound reference, so choose the slug
deliberately and treat it as permanent.

### Other ways to publish

- **`pnpm dev`** — localhost:4321, live reload, renders in the real design
- **github.com web editor** — add a file under `src/content/posts/`; works from an iPad
- **GitHub mobile app** — fine for a short post or a typo fix

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server at localhost:4321 |
| `pnpm build` | Build to `dist/` |
| `pnpm preview` | Serve the built output |
| `pnpm verify` | Assert the build is correct — run after `build` |
| `pnpm new-post "Title"` | Scaffold a post (`--lang=sq`, `--draft`) |

`pnpm verify` is not a linter. It asserts the specific defects that shipped on
the old site cannot recur: absolute canonicals and `og:url`, exactly one `<h1>`
per page, unique non-empty descriptions, valid JSON-LD, `CNAME` present in
`dist/`, the feed at its original path, and zero references to the dead image
hosts. It exits non-zero on failure.

## Structure

```
src/
  content/posts/*.md   the posts; filename = URL
  content.config.ts    front matter schema (Zod)
  components/Seo.astro the ONLY place meta tags are emitted
  layouts/             Base (nav + shell), Post
  pages/               index, bio, contact, 404, feed.xml, robots.txt
    [slug].astro                     /some-post.html
    [year]/[month]/[day]/[slug].astro  redirect stubs for old URLs
public/
  CNAME                custom domain — must survive into dist/
  assets/images/       images recovered from the old blog
scripts/
  migrate-posts.mjs    one-shot Jekyll -> Astro (audit trail)
  recover-images.mjs   one-shot image recovery (re-runnable)
  new-post.mjs         ongoing
```

## Notes for future maintenance

- **Deploys come from `master`**, not `main`. The Actions workflow triggers on
  `master` because that is this repo's default branch.
- **GitHub Pages source must stay set to "GitHub Actions"** in repo settings. If
  it reverts to "Deploy from a branch", GitHub will try to Jekyll-build this
  Astro source and the site will break.
- **`public/CNAME` is load-bearing.** Astro only copies `public/`; if that file
  goes missing the deploy silently unsets the custom domain.
- **`/feed.xml` is a permanent contract.** It has been the feed URL since the
  Jekyll days. Moving it drops every existing subscriber.
- **Old post URLs** (`/YYYY/MM/DD/slug.html`) are served as generated redirect
  stubs. GitHub Pages cannot issue real 301s, so these are canonical +
  meta-refresh, which Google treats as equivalent. They are derived from each
  post's `pubDate` and never need hand-maintenance.

## History

This replaced a Jekyll 3.9 site on the stock `minima` theme that had not
rebuilt since April 2021. See `IMAGE-RECOVERY-REPORT.md` for what happened to
the archive's images and `DESCRIPTIONS-REVIEW.md` for the auto-drafted post
descriptions.
