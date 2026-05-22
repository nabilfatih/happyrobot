import { createFileRoute } from "@tanstack/react-router";
import { runApi, verifyCarrierProgram } from "@/server/api";

export const Route = createFileRoute("/api/carriers/verify")({
  server: {
    handlers: {
      POST: ({ request }) => runApi(verifyCarrierProgram(request)),
    },
  },
});
