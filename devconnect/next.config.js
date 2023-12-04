const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin')
const path = require('path')

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    // Need this for webpack to parse files outside this directory, e.g. from the "lib" folder in the monorepo
    externalDir: true,
  },
  // transpilePackages: ['lib'],
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
  webpack: (config, { webpack }) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'src'), 'node_modules'],
      },
      plugins: [
        // Only include tz data for the zone we use
        new MomentTimezoneDataPlugin({
          matchZones: /^Europe\/Istanbul/,
        }),
        new webpack.DefinePlugin({
          devMode: process.env.NODE_ENV !== 'production',
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
          ...config.module.rules,
        ],
      },
    }
  },
}
