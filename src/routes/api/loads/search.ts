import { createFileRoute } from "@tanstack/react-router";
import {
  runApi,
  searchLoadsProgram,
  searchLoadsQueryProgram,
} from "@/server/api";

export const Route = createFileRoute("/api/loads/search")({
  server: {
    handlers: {
      GET: ({ request }) => runApi(searchLoadsQueryProgram(request)),
      POST: ({ request }) => runApi(searchLoadsProgram(request)),
    },
  },
});
