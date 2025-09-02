/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['es', 'en', 'pt'],
    defaultLocale: 'es',
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
