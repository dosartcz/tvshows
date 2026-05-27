/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'www.themoviedb.org' },
      { protocol: 'https', hostname: '**.tvline.com' },
      { protocol: 'https', hostname: '**.deadline.com' },
      { protocol: 'https', hostname: '**.thewrap.com' },
      { protocol: 'https', hostname: '**.collider.com' },
      { protocol: 'https', hostname: '**.colliderimages.com' },
      { protocol: 'https', hostname: 'variety.com' },
      { protocol: 'https', hostname: '**.variety.com' },
      { protocol: 'https', hostname: '**.tvinsider.com' },
      { protocol: 'https', hostname: '**.ew.com' },
      { protocol: 'https', hostname: 'ew.com' },
    ],
  },
}

module.exports = nextConfig
