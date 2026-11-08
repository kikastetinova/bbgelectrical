import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Let the built site also open straight from disk (file://), not only from a
// server. Browsers block `type="module"` scripts and `crossorigin` requests on
// file://, so the production HTML loads the bundle as a classic deferred script.
// That's safe here: src/main.js has no imports or exports, so the bundle is
// plain code.
function classicScripts() {
  return {
    name: "classic-scripts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        html
          .replace(/<script type="module" crossorigin /g, "<script defer ")
          .replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" '),
    },
  };
}

export default defineConfig({
  // Relative asset URLs, so dist/ works from any folder or from file://.
  base: "./",
  plugins: [tailwindcss(), classicScripts()],
  css: {
    preprocessorOptions: {
      scss: {
        // The partials still use @import; silence Sass's deprecation notice.
        silenceDeprecations: ["import"],
      },
    },
  },
  build: {
    outDir: "dist",
    // The modulepreload polyfill is only needed for module scripts.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        projects: resolve(import.meta.dirname, "projects.html"),
      },
    },
  },
});
