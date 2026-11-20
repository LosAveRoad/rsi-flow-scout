import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  resolve: {
    // Ensure 'rsi-flow-react' (local file dependency) shares a single React instance.
    dedupe: ['react', 'react-dom', '@xyflow/react', 'lucide-react'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@xyflow/react': path.resolve(__dirname, 'node_modules/@xyflow/react'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
  },
});
