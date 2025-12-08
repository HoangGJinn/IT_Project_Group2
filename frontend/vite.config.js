import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    // Server config chỉ dùng trong development
    server: {
      host: '0.0.0.0', // Cho phép ngrok tunnel
      port: parseInt(env.VITE_PORT) || 3000,
      strictPort: false,
      // Allow ngrok domains and localhost
      allowedHosts: [
        '.ngrok.io',
        '.ngrok-free.app',
        '.ngrok.app',
        '.ngrok-free.dev',
        'localhost',
        '127.0.0.1',
      ],
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          ws: true, // Enable websocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    // Build optimizations cho production
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction, // Chỉ tạo sourcemap trong development
      minify: isProduction ? 'esbuild' : false,
      chunkSizeWarningLimit: 1000, // Tăng limit để tránh warning
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['react-bootstrap', 'bootstrap'],
          },
        },
      },
    },
  };
});
