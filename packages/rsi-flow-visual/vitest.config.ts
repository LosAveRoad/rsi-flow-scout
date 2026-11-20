import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@xyflow/react', 'lucide-react'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@xyflow/react': path.resolve(__dirname, 'node_modules/@xyflow/react'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
  },
});
