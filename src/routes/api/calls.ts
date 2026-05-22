import { createFileRoute } from "@tanstack/react-router";
import { ingestCallProgram, runApi } from "@/server/api";

export const Route = createFileRoute("/api/calls")({
  server: {
    handlers: {
      POST: ({ request }) => runApi(ingestCallProgram(request)),
    },
  },
});
