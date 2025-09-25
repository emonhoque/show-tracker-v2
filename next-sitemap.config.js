/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://show-tracker.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    '/api/*',
    '/auth/*',
    '/signin',
    '/signout',
    '/access-denied',
    '/invite/*',
    '/share/*'
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/signin',
          '/signout',
          '/access-denied',
          '/invite/',
          '/share/'
        ]
      }
    ],
    additionalSitemaps: []
  },
  transform: async (config, path) => {
    // Custom transform function to handle dynamic routes
    return {
      loc: path,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: new Date().toISOString()
    }
  }
}
