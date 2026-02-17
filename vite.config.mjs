import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      babylonjs: mode === 'development' ? 'babylonjs/babylon.max' : 'babylonjs',
    },
  },
  build: {
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['babylonjs'],
        },
      },
    },
  },
}));
