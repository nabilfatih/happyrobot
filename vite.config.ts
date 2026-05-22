import tailwindcss from "@tailwindcss/vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

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
    test: {
      exclude: [...configDefaults.exclude, "confect/**/*.spec.ts"],
    },
  };
});

export default config;
