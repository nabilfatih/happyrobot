/** Baseline response headers that are safe for API and dashboard responses. */
export const securityHeaders = {
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;
