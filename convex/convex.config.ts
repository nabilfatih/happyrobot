import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    CONVEX_BACKEND_KEY: v.string(),
    FMCSA_WEB_KEY: v.string(),
  },
});
