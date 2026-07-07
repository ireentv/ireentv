import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Automatically build public assets and copy generated high-quality icon files
try {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const sourceIcon = path.resolve(process.cwd(), 'src/assets/images/ireentv_pwa_icon_1780415765036.png');
  if (fs.existsSync(sourceIcon)) {
    fs.copyFileSync(sourceIcon, path.join(publicDir, 'icon-512.png'));
    fs.copyFileSync(sourceIcon, path.join(publicDir, 'icon-192.png'));
    console.log('Successfully prepared PWA Launcher Icons in public directory.');
  }
} catch (err) {
  console.warn('Silent fallback for icon generation in limited directory access environment:', err);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
