export const SITE = {
  title: 'Betim Drenica',
  // Replaces the Jekyll scaffold placeholder that shipped as this site's
  // Google snippet for years: "Write an awesome description for your new
  // site here. You can edit this line in _config.yml..."
  description:
    'Essays and notes by Betim Drenica — software architect, building Sent. Writing on software design, APIs, and the craft of building things.',
  author: 'Betim Drenica',
  locale: 'en_US',
} as const

export const NAV = [
  { label: 'Posts', href: '/' },
  { label: 'Bio', href: '/bio.html' },
  { label: 'Sent', href: 'https://www.sent.dm/', external: true },
  { label: 'Twitter', href: 'https://x.com/betimdrenica', external: true },
  { label: 'Contact', href: '/contact.html' },
] as const

export const SOCIAL = {
  x: 'https://x.com/betimdrenica',
  xHandle: '@betimdrenica',
  github: 'https://github.com/betimd',
  linkedin: 'https://www.linkedin.com/in/betim',
  sent: 'https://www.sent.dm/',
} as const

/** Public by design — Web3Forms keys are meant for client-side code. */
export const WEB3FORMS_KEY = '10a33985-a1fb-4466-87f9-e9e2b8a33c9f'

/** "Mar 2015" — matches the compact date style of the post list. */
export const formatDateShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "9 March 2015" — used on the post pages themselves. */
export const formatDateLong = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
