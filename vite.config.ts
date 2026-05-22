import tailwindcss from "@tailwindcss/vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig(({ mode }) => {
  const serverPlugins =
    mode === "test"
      ? []
      : [
          nitro({ rollupConfig: { external: [/^@sentry\//] } }),
          tanstackStart(),
        ];

  return {
    resolve: { tsconfigPaths: true },
    plugins: [...serverPlugins, tailwindcss(), viteReact()],
  };
});

export default config;
