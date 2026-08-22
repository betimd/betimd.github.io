import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '../consts'

/**
 * Served at /feed.xml — deliberately the same path the Jekyll site used.
 *
 * jekyll-feed published /feed.xml for years and it still returns 200 today.
 * Moving the feed to /rss.xml would silently drop every existing subscriber,
 * so the path is treated as a permanent contract.
 */
export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  )

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/${post.id}.html`,
    })),
    customData: '<language>en-us</language>',
  })
}
