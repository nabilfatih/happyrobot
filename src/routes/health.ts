import { createFileRoute } from "@tanstack/react-router";
import { securityHeaders } from "@/server/security-headers";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { ok: true },
          {
            headers: securityHeaders,
          },
        ),
    },
  },
});
