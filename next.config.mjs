/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

if (process.env.OPENNEXT_CF_DEV === '1') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev())
}
