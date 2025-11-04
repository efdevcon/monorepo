import { createSerwistRoute } from '@serwist/turbopack';
import path from 'node:path';
export const dynamic = 'force-static';

export const { generateStaticParams, GET } = createSerwistRoute({
  swSrc: path.join(process.cwd(), 'src/app/sw.ts'),
  globDirectory: path.join(process.cwd(), '.next/static'),
  globPatterns: [
    '**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}',
  ],
  globIgnores: [],
  injectionPoint: 'self.__SW_MANIFEST',
  manifestTransforms: [
    (manifestEntries: any) => {
      const manifest = manifestEntries.map((m: any) => {
        if (!m.url.startsWith('/')) {
          m.url = `/_next/static/${m.url}`;
        }
        return m;
      });
      return { manifest, warnings: [] };
    },
  ],
  nextConfig: {
    basePath: '/',
    distDir: '.next',
    assetPrefix: '/',
  },
});
