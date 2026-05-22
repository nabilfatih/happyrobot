import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer } from "effect";
import api from "#confect/_generated/api";
import { DatabaseWriter } from "#confect/_generated/services";
import { currentIsoTime, requireBackendKey } from "#confect/backend";

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
