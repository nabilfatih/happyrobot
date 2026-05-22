import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer } from "effect";
import { searchLoadRecords, summarizeLoad } from "#/domain/loads";
import api from "#confect/_generated/api";
import { DatabaseReader, DatabaseWriter } from "#confect/_generated/services";
import { requireBackendKey } from "#confect/backend";
import { seedLoads } from "#confect/load-seed";

const search = FunctionImpl.make(api, "loads", "search", (input) =>
  Effect.gen(function* () {
    yield* requireBackendKey(input.backendKey);

    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    yield* seedLoads(reader, writer).pipe(Effect.orDie);

    const records = yield* reader
      .table("loads")
      .index("by_load_id")
      .collect()
      .pipe(Effect.orDie);
    const result = searchLoadRecords(records, input);

    if (!result.selected) {
      return {
        alternatives: [],
        matched: false,
        selected: null,
      };
    }

    return {
      alternatives: result.alternatives,
      matched: true,
      pitch: summarizeLoad(result.selected),
      selected: result.selected,
    };
  }),
);

export const loads = GroupImpl.make(api, "loads").pipe(Layer.provide(search));
