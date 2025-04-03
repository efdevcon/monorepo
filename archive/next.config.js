const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  trailingSlash: true,
  experimental: {
    externalDir: true,
  },
  webpack: (config, { buildId, webpack }) => {
    config.module.rules.push(
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
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    // fileLoaderRule.exclude = /\.svg$/i;

    return {
      ...config,
      plugins: [
        ...config.plugins,
        new webpack.DefinePlugin({
          'process.env.CONFIG_BUILD_ID': JSON.stringify(buildId),
        }),
      ],
      resolve: {
        ...config.resolve,
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'src'), 'node_modules'],
      },
    };
  },
};

module.exports = nextConfig