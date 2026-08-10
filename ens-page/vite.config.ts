import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// base './' makes all asset paths relative so the bundle works from any IPFS
// gateway path (/ipfs/<cid>/) as well as the eth.limo root.
export default defineConfig({
  base: './',
  plugins: [react(), svgr()],
})
