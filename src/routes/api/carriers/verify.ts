import { createFileRoute } from "@tanstack/react-router";
import {
  runApi,
  verifyCarrierProgram,
  verifyCarrierQueryProgram,
} from "#/server/api";

export const Route = createFileRoute("/api/carriers/verify")({
  server: {
    handlers: {
      GET: ({ request }) => runApi(verifyCarrierQueryProgram(request)),
      POST: ({ request }) => runApi(verifyCarrierProgram(request)),
    },
  },
});
