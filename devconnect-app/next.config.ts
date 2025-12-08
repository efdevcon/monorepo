import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  transpilePackages: ['lib'],
  serverExternalPackages: ['esbuild', 'esbuild-wasm', '@esbuild/linux-x64'],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Force pino to use its browser version (which doesn't use thread-stream)
    // This fixes Next.js 16 bundling issues with thread-stream test files
    config.resolve.alias = {
      ...config.resolve.alias,
      pino: require.resolve('pino/browser.js'),
    };

    if (!isServer) {
      // Fallbacks for Node.js modules in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      // Provide a mock fastfile module for client-side builds
      config.resolve.alias = {
        ...config.resolve.alias,
        pino: require.resolve('pino/browser.js'),
        fastfile: require.resolve('./webpack/fastfile-mock.js'),
      };
    }

    // Apply specific config for maps folder SVGs
    config.module.rules.push({
      test: /\.svg$/,
      include: /\/maps\//,
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
                      cleanupIds: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });

    return config;
  },
  turbopack: {
    // Force pino to use its browser version (which doesn't use thread-stream)
    resolveAlias: {
      pino: 'pino/browser.js',
    },
    rules: {
      // Prevent ID cleanup for SVGs in maps folder
      '**/maps/**/*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        cleanupIds: false,
                        removeUnusedNS: false,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: '*.js',
      },
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default withNextIntl(nextConfig);
