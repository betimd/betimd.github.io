import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const posts = defineCollection({
  // `[^_]*` skips _TEMPLATE.md so the template never builds as a real post.
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),

    // `description` is deliberately REQUIRED, not optional.
    //
    // The old site let jekyll-seo-tag auto-extract descriptions from the first
    // heading, which produced snippets like "Introduction / short history" for
    // an entire archive. Making this required means a post without a real
    // description fails the build with the filename, instead of silently
    // shipping a useless Google snippet.
    description: z.string().min(1).max(300),

    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    // 16 of the 35 migrated posts are Albanian. Drives <html lang> per page.
    lang: z.enum(['en', 'sq']).default('en'),

    // Carried over from the WordPress export. Not rendered anywhere — this
    // site has no tag pages — but there's no reason to destroy the data.
    tags: z.array(z.string()).default([]),

    // Excluded from builds. Lets work-in-progress live in the repo.
    draft: z.boolean().default(false),

    // Relative path under /public, used for og:image when a post has one.
    image: z.string().optional(),
  }),
})

export const collections = { posts }
