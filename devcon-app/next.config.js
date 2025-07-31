const withPWA = require('next-pwa')
const webpack = require('webpack')
const { nanoid } = require('nanoid')
// const { PHASE_PRODUCTION_BUILD } = require('next/constants')
// const { withSentryConfig } = require('@sentry/nextjs')
const getGeneratedPrecacheEntries = require('./precache')
const getStaticPrecacheEntries = require('./precache-public')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const runtimeCache = require('./runtime-cache')
const PriorityNodeModulesResolverPlugin = require('../lib/helpers/custom-module-resolver')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@parcnet-js/podspec', '@pcd/pod', 'lib'],
  staticPageGenerationTimeout: 300,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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

  // sentry: {
  //   hideSourceMaps: true,
  // },
  webpack: (config, { buildId }) => {
    // Inject our custom resolver plugin at the beginning of the plugins list.
    // config.resolve.plugins = config.resolve.plugins || []
    // config.resolve.plugins.unshift(new PriorityNodeModulesResolverPlugin())

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
        alias: {
          ...config.resolve.alias,
          // react: path.resolve(__dirname, 'node_modules/react'),
          // 'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
          // recoil: path.resolve(__dirname, 'node_modules/recoil'),
        },
        plugins: [
          ...config.resolve.plugins,
          // new PriorityNodeModulesResolverPlugin(),
        ],
        modules: [
          path.resolve(__dirname, 'src'),
          'node_modules',
          path.resolve(__dirname, 'node_modules'),
        ],
        // fallback: {
        //   tls: false,
        //   net: false,
        //   fs: false,
        // },
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
                            cleanupIDs: false,
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
        source: '/side-events',
        destination: 'https://devcon.org/devcon-week',
      },
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

  const pwaConfig = withPWA({
    dest: '/public',
    additionalManifestEntries: [...getGeneratedPrecacheEntries(buildId) /*, ...getStaticPrecacheEntries({})*/],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    dynamicStartUrl: false,
    skipWaiting: false,
    customWorkerDir: 'workbox',
    cacheOnFrontEndNav: true,
    ignoreURLParametersMatching: [/^session/, /^speaker/, /^room/, /^floor/],
    buildExcludes: [/media\/.*$/, /\.map$/],
    maximumFileSizeToCacheInBytes: 10000000, // this is important, the default file cache size is low, and it can cause some weird problems if certain files aren't cached
    runtimeCaching: runtimeCache,
    // fallbacks: {
    //   image:
    //     'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    // },
  })

  return pwaConfig(config)
}

module.exports = createConfig