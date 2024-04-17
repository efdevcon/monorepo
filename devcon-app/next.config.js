const withPWA = require('next-pwa')
const webpack = require('webpack')
const { nanoid } = require('nanoid')
const { PHASE_PRODUCTION_BUILD } = require('next/constants')
const getGeneratedPrecacheEntries = require('./precache')
const getStaticPrecacheEntries = require('./precache-public')
const { withSentryConfig } = require('@sentry/nextjs')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const runtimeCache = require('./runtime-cache')

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  experimental: {
    // Need this for webpack to parse files outside this directory, e.g. from the "lib" folder in the monorepo
    externalDir: true,
  },
  // sentry: {
  //   hideSourceMaps: true,
  // },
  webpack: (config, { buildId }) => {
    return {
      ...config,
      plugins: [
        ...config.plugins,
        // new BundleAnalyzerPlugin(),
        new webpack.DefinePlugin({
          'process.env.CONFIG_BUILD_ID': JSON.stringify(buildId),
          'process.env.VAPID_PUBLIC': JSON.stringify(process.env.VAPID_PUBLIC),
        }),
      ],
      resolve: {
        ...config.resolve,
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'src'), 'node_modules'],
        fallback: {
          tls: false,
          net: false,
          fs: false,
        },
      },
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
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
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
}

const createConfig = phase => {
  const buildId = nanoid()

  let config = {
    ...nextConfig,
    generateBuildId: () => buildId,
  }

  // if (phase === PHASE_PRODUCTION_BUILD) {
  const pwaConfig = withPWA({
    dest: '/public',
    additionalManifestEntries: [...getGeneratedPrecacheEntries(buildId) /*, ...getStaticPrecacheEntries({})*/],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    dynamicStartUrl: false,
    customWorkerDir: 'workbox',
    cacheOnFrontEndNav: true,
    ignoreURLParametersMatching: [/^session/, /^speaker/, /^room/, /^floor/],
    buildExcludes: [/media\/.*$/, /\.map$/],
    runtimeCaching: runtimeCache,
    // fallbacks: {
    //   image:
    //     'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    // },
  })

  return pwaConfig(config)
  // }

  return config
}

// const config = createConfig()

module.exports = createConfig

// module.exports = withSentryConfig(
//   (phase, { defaultConfig }) => {
//     const buildId = nanoid()

//     let config = {
//       ...defaultConfig,
//       ...nextConfig,
//       generateBuildId: () => buildId,
//     }

//     if (phase === PHASE_PRODUCTION_BUILD) {
//       config = withPWA({
//         ...config,
//         pwa: {
//           dest: '/public',
//           additionalManifestEntries: [...getGeneratedPrecacheEntries(buildId) /*, ...getStaticPrecacheEntries({})*/],
//           mode: 'production',
//           dynamicStartUrl: false,
//           customWorkerDir: 'workbox',
//           cacheOnFrontEndNav: true,
//           ignoreURLParametersMatching: [/^session/, /^speaker/, /^room/, /^floor/],
//           buildExcludes: [/media\/.*$/, /\.map$/],
//           // fallbacks: {
//           //   image:
//           //     'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
//           // },
//         },
//       })
//     }

//     return config
//   },
//   {
//     silent: true, // Suppresses all Sentry logs
//   }
// )
