import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer, Option } from "effect";
import {
  describeCarrierStatus,
  fetchCarrierFromFmcsa,
} from "../src/domain/carriers";
import type { CachedCarrier } from "../src/domain/schemas";
import api from "./_generated/api";
import refs from "./_generated/refs";
import {
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from "./_generated/services";
import {
  readFmcsaWebKey,
  requireBackendKey,
  requireBackendMcNumber,
} from "./backend";
import { BackendExternalError } from "./errors";

const verify = FunctionImpl.make(
  api,
  "carriers",
  "verify",
  ({ backendKey, mcNumber: rawMcNumber }) =>
    Effect.gen(function* () {
      yield* requireBackendKey(backendKey);

      const mcNumber = yield* requireBackendMcNumber(rawMcNumber);
      const query = yield* QueryRunner;
      const cached = yield* query(refs.internal.carriers.cacheByMc, {
        mcNumber,
      }).pipe(Effect.orDie);

      if (cached && hasCarrierStatus(cached)) {
        return {
          cacheHit: true,
          carrier: cached,
          message: describeCarrierStatus(cached),
        };
      }

      const webKey = yield* readFmcsaWebKey();
      const carrier = yield* fetchCarrierFromFmcsa(mcNumber, webKey).pipe(
        Effect.mapError(
          (error) =>
            new BackendExternalError({
              message: error.message,
              status: error.status,
            }),
        ),
      );
      const mutation = yield* MutationRunner;
      const saved = yield* mutation(
        refs.internal.carriers.saveCache,
        carrier,
      ).pipe(Effect.orDie);

      return {
        cacheHit: false,
        carrier: saved,
        message: describeCarrierStatus(saved),
      };
    }),
);

const cacheByMc = FunctionImpl.make(
  api,
  "carriers",
  "cacheByMc",
  ({ mcNumber }) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const result = yield* reader
        .table("fmcsaCache")
        .index("by_mcNumber", (query) => query.eq("mcNumber", mcNumber))
        .first();

      return Option.match(result, {
        onNone: () => null,
        onSome: (carrier) => carrier,
      });
    }).pipe(Effect.orDie),
);

const saveCache = FunctionImpl.make(api, "carriers", "saveCache", (carrier) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const current = yield* reader
      .table("fmcsaCache")
      .index("by_mcNumber", (query) => query.eq("mcNumber", carrier.mcNumber))
      .first();

    yield* Option.match(current, {
      onNone: () => writer.table("fmcsaCache").insert(carrier),
      onSome: (saved) => writer.table("fmcsaCache").patch(saved._id, carrier),
    });

    return carrier;
  }).pipe(Effect.orDie),
);

export const carriers = GroupImpl.make(api, "carriers").pipe(
  Layer.provide(verify),
  Layer.provide(cacheByMc),
  Layer.provide(saveCache),
);

function hasCarrierStatus(carrier: CachedCarrier) {
  return Boolean(carrier.allowToOperate && carrier.outOfService);
}
