const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  optimizeFonts: true,
  poweredByHeader: false,
  trailingSlash: true,
  transpilePackages: ["lib"],
  redirects() {
    // Generic page redirects from Gatsby archive are managed here.
    // Session specific redirects are managed as dynamic routes to avoid performance issues.
    const redirects = [
      {
        source: "/archive",
        destination: "/",
        permanent: true,
      },
      {
        source: "/archive/watch",
        destination: "/watch",
        permanent: true,
      },
      {
        source: "/archive/playlists",
        destination: "/watch",
        permanent: true,
      },
      ...Array.from({ length: 8 }, (_, i) => ({
        source: `/archive/playlists/devcon-${7 - i}`,
        destination: `/watch?event=devcon-${7 - i}`,
        permanent: true,
      })),
    ];

    return redirects;
  },
  webpack: (config, { buildId, webpack }) => {
    config.module.rules.push(
      {
        test: /\.svg$/,
        exclude: /icons/,
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: "preset-default",
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
            loader: "@svgr/webpack",
            options: {
              icon: true,
              svgProps: {
                className: "icon",
              },
              svgoConfig: {
                plugins: [
                  {
                    name: "preset-default",
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
        use: ["raw-loader", "glslify-loader"],
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    // fileLoaderRule.exclude = /\.svg$/i;

    return {
      ...config,
      plugins: [
        ...config.plugins,
        new webpack.DefinePlugin({
          "process.env.CONFIG_BUILD_ID": JSON.stringify(buildId),
        }),
      ],
    };
  },
};

module.exports = nextConfig;
