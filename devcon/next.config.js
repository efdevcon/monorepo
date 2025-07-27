// const { withSentryConfig } = require('@sentry/nextjs')
const path = require('path')
// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   enabled: true || process.env.ANALYZE === 'true',
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lib'],
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: [
      'speak.devcon.org',
      'storage.googleapis.com',
      'avatars.githubusercontent.com',
      'camo.githubusercontent.com',
      'blog.ethereum.org',
      'img.youtube.com',
      'www.gravatar.com',
      'assets.tina.io',
      'cfp.ticketh.xyz',
    ],
  },
  i18n: {
    locales: ['default', 'en', 'es'],
    defaultLocale: 'default',
    localeDetection: false,
  },
  trailingSlash: true,
  webpack: (config, { buildId, webpack }) => {
    return {
      ...config,
      plugins: [
        ...config.plugins,
        new webpack.DefinePlugin({
          'process.env.CONFIG_BUILD_ID': JSON.stringify(buildId),
        }),
      ],
      module: {
        ...config.module,
        rules: [
          {
            test: /\.svg$/,
            include: /images/,
            issuer: { not: /\.(css|scss|sass)$/ },
            use: [
              {
                loader: '@svgr/webpack',
                options: {
                  svgoConfig: {
                    plugins: [
                      {
                        name: 'preset-default',
                        params: {
                          overrides: {
                            removeViewBox: false,
                            cleanupIDs: false, // Critical to have this, otherwise svgs can start affecting each other
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          // Separate config for icon loading
          {
            test: /\.svg$/,
            include: /assets.icons/,
            issuer: { not: /\.(css|scss|sass)$/ },
            use: [
              {
                loader: '@svgr/webpack',
                options: {
                  icon: true,
                  svgProps: {
                    className: 'icon',
                  },
                  svgoConfig: {
                    plugins: [
                      {
                        name: 'preset-default',
                        params: {
                          overrides: {
                            removeViewBox: false,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          {
            test: /\.(glsl|vs|fs|vert|frag)$/,
            exclude: /node_modules/,
            use: ['raw-loader', 'glslify-loader'],
          },
          ...config.module.rules,
        ],
      },
    }
  },
  async headers() {
    return [
      // {
      //   source: '/(.*)',
      //   headers: [
      //     {
      //       key: 'X-Frame-Options',
      //       value: 'DENY',
      //     },
      //   ],
      // },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/grants',
        destination: 'https://esp.ethereum.foundation/devcon-grants',
        permanent: true,
      },
      {
        source: '/surveypoap',
        destination: 'https://www.poap.delivery/devcon-vi-attendee-feedback-survey',
        permanent: true,
      },
      {
        source: '/devcon-0',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-0/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-1',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-1/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-2',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-2/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-3',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-3/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-4',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-4/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-5',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/devcon-5/details',
        destination: '/past-events',
        permanent: true,
      },
      {
        source: '/agenda',
        destination: '/en/program',
        permanent: true,
      },
      {
        source: '/lightning-speakers',
        destination: '/en/program',
        permanent: true,
      },
      {
        source: '/workshops-and-breakouts',
        destination: '/en/program',
        permanent: true,
      },
      {
        source: '/call-for-participation',
        destination: '/en/applications',
        permanent: true,
      },
      {
        source: '/speakers',
        destination: '/en/applications',
        permanent: true,
      },
      {
        source: '/speakers-guide',
        destination: 'https://ef-events.notion.site/Speakers-Devcon-Wiki-127638cdc41580619bb4f8dd7f735e52',
        permanent: true,
      },
      {
        source: '/reserve',
        destination:
          'https://ef-events.notion.site/Public-Devcon-Meeting-Rooms-and-Discussion-Corners-Booking-System-11c638cdc41580318344cf7736c02f92?pvs=4',
        permanent: true,
      },
      {
        source: '/schedule',
        destination: 'https://app.devcon.org/schedule',
        permanent: true,
      },
      {
        source: '/vi',
        destination: '/',
        permanent: true,
      },
      {
        source: '/zh',
        destination: '/',
        permanent: true,
      },
    ]
  },
  env: {
    RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED: 'false',
  },
}

module.exports = nextConfig

// module.exports = withSentryConfig(nextConfig, {
//   silent: true, // Suppresses all Sentry logs
// })
