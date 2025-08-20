/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'loserpool.vercel.app',
          },
        ],
        destination: 'https://loserpool.app/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
