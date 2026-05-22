import { createFileRoute } from "@tanstack/react-router";
import { evaluateOfferProgram, runApi } from "@/server/api";

export const Route = createFileRoute("/api/offers/evaluate")({
  server: {
    handlers: {
      POST: ({ request }) => runApi(evaluateOfferProgram(request)),
    },
  },
});
