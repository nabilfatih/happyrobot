/// <reference types="vite/client" />

import { TestConfect as TestConfect_ } from "@confect/test";
import schema from "./schema";

export const TestConfect = TestConfect_.TestConfect<typeof schema>();

export const layer = TestConfect_.layer(
  schema,
  import.meta.glob([
    "../convex/**/*.ts",
    "../convex/**/*.js",
    "!../convex/**/*.d.ts",
  ]),
);
