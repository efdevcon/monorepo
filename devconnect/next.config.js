const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
    WC_PROJECT_ID: process.env.WC_PROJECT_ID,
  },
  i18n: {
    locales: ['en', 'es', 'pt'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  // Add redirects to netlify.toml - netlify doesn't seem to pick up next.config.js redirects
  redirects: () => {
    return [
      {
        source: '/host',
        destination: 'https://ef-events.notion.site/Host-an-event-at-Devconnect-8d1c95ea7f4f41d9a4239eb87ed1fb03',
        permanent: false,
      },
      // {
      //   source: '/istanbul',
      //   destination: 'https://devconnect.org/schedule',
      //   permanent: false,
      // },
      {
        source: '/schedule/istanbul',
        destination: 'https://devconnect.org/schedule',
        permanent: false,
      },
      {
        source: '/schedule/amsterdam',
        destination: 'https://devconnect.org/amsterdam',
        permanent: false,
      },
    ]
  },
  transpilePackages: ['lib'],
  images: {
    domains: [
      'speak.devcon.org',
      'storage.googleapis.com',
      'avatars.githubusercontent.com',
      'camo.githubusercontent.com',
      'blog.ethereum.org',
      'img.youtube.com',
      'www.gravatar.com',
      'mealmslwugsqqyoesrxd.supabase.co',
    ],
  },
  webpack: (config, { webpack, isServer }) => {
    const artifactPackageJsonPath = require.resolve('@pcd/proto-pod-gpc-artifacts/package.json')
    const artifactPath = path.dirname(artifactPackageJsonPath)

    const newConfig = {
      ...config,
      // resolve: {
      //   ...config.resolve,
      //   modules: [path.resolve(__dirname, 'src'), 'node_modules', path.resolve(__dirname, 'node_modules')],
      // },
      plugins: [
        // Only include tz data for the zone we use
        new MomentTimezoneDataPlugin({
          matchZones: [/^Europe\/Istanbul/, /^America\/Argentina\/Buenos_Aires/],
        }),
        new webpack.DefinePlugin({
          devMode: process.env.NODE_ENV !== 'production',
        }),
        new CopyPlugin({
          patterns: [
            {
              from: artifactPath,
              to: path.join(__dirname, 'public/artifacts'),
              force: true,
            },
          ],
        }),
        ...config.plugins,
      ],
      module: {
        ...config.module,
        rules: [
          {
            test: /\.svg$/,
            exclude: /icons/,
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
            test: /\.svg$/,
            include: /icons/,
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
          {
            test: /fastfile/,
            use: {
              loader: 'null-loader',
            },
          },
          ...config.module.rules,
        ],
      },
    }

    return newConfig
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
}
