import { createFileRoute } from "@tanstack/react-router";
import { runApi, searchLoadsProgram } from "@/server/api";

export const Route = createFileRoute("/api/loads/search")({
  server: {
    handlers: {
      POST: ({ request }) => runApi(searchLoadsProgram(request)),
    },
  },
});
