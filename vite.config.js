import { resolve } from "path";
import { defineConfig } from "vite";

// Help for this config file:
// https://vitejs.dev/config/#config-intellisense

export default defineConfig({
  build: {
    target: "esnext",
    // This works well with GitHub pages.  GitHub can put everything in the docs directory on the web.
    outDir: "docs",
    rollupOptions: {
      input: {
        // The property names (e.g. אֶחָד, שְׁנַיִם) are only used in one place (as far as I can tell).
        // Some of the names of _internal_ files will be based on these names.  These are the same
        // files that have hashes in their file names.  A user would never see these unless he was
        // looking at the page source, the dev tools, etc.  I.e. the property names don't matter.
        索引: resolve(__dirname, "index.html"),
        /*
        אֶחָד: resolve(__dirname, "index.html"),
        שְׁנַיִם: resolve(__dirname, "spheres-dev.html"),
        שְׁלֹושָׁה: resolve(__dirname, "spheres-starfield.html"),
        אַרְבָּעָה: resolve(__dirname, "morph.html"),
        חֲמִשָּׁה: resolve(__dirname, "letters.html"),
        שִׁשָּׁה: resolve(__dirname, "sky-writing.html"),
        שִׁבְעָה: resolve(__dirname, "curves.html"),
        שְׁמוֹנָה: resolve(__dirname, "path-debugger.html"), */
      },
    },
  },
  // This is the important part.  The default configuration assumes I have access
  // to the root of the webserver, and each project will share some assets.
  base: "./",
});
