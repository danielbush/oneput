import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // See https://vite.dev/guide/build#library-mode (build.lib)
  build: {
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'ui/oneput/app/index': resolve(__dirname, 'src/ui/oneput/app/index.ts')
      },
      name: 'jsed',
      formats: ['es'],
      // the proper extensions will be added
      fileName: (_format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [/^@oneput\/oneput(\/.*)?$/, 'lucide'],
      output: {
        dir: 'dist'
      }
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      // external: ['vue'],
      // output: {
      //   // Provide global variables to use in the UMD build
      //   // for externalized deps
      //   globals: {
      //     vue: 'Vue',
      //   },
      // },
    }
  }
});
