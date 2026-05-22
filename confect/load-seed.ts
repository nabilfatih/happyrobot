import { Effect, Option } from "effect";
import { loads } from "../src/domain/loads";
import type { DatabaseReader, DatabaseWriter } from "./_generated/services";

/** Upserts the JSON seed loads into Convex before load-dependent work. */
export function seedLoads(reader: DatabaseReader, writer: DatabaseWriter) {
  return Effect.forEach(
    loads,
    (load) =>
      Effect.gen(function* () {
        const current = yield* reader
          .table("loads")
          .index("by_load_id", (query) => query.eq("load_id", load.load_id))
          .first();

        yield* Option.match(current, {
          onNone: () => writer.table("loads").insert(load),
          onSome: (stored) => writer.table("loads").patch(stored._id, load),
        });
      }),
    { discard: true },
  );
}
