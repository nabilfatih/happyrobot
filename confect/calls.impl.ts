import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer } from "effect";
import api from "./_generated/api";
import { DatabaseWriter } from "./_generated/services";
import { currentIsoTime, requireBackendKey } from "./backend";

const ingest = FunctionImpl.make(
  api,
  "calls",
  "ingest",
  ({ backendKey, ...input }) =>
    Effect.gen(function* () {
      yield* requireBackendKey(backendKey);

      const writer = yield* DatabaseWriter;
      const callId = yield* writer
        .table("calls")
        .insert({
          ...input,
          createdAt: currentIsoTime(),
          offers: input.offers ?? [],
        })
        .pipe(Effect.orDie);

      return {
        callId: String(callId),
        stored: true,
      };
    }),
);

export const calls = GroupImpl.make(api, "calls").pipe(Layer.provide(ingest));
