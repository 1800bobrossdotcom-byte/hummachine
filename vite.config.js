import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// hummachine ships as ONE self-contained index.html so it can be minted as an
// HTML/animation_url NFT (Manifold -> SuperRare). vite-plugin-singlefile inlines
// JS + CSS; a huge assetsInlineLimit forces every audio sample to embed as a
// base64 data URI, so the final token has zero external dependencies.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    assetsInlineLimit: 1024 * 1024 * 1024, // inline everything
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1024 * 1024,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
