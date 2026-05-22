import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer, Schema } from "effect";
import { buildDashboardReport } from "#/domain/metrics";
import { CallRecord, OfferEvent } from "#/domain/schemas";
import api from "#confect/_generated/api";
import { DatabaseReader } from "#confect/_generated/services";
import {
  requireBackendKey,
  requireDashboardRealtimeToken,
} from "#confect/backend";

const report = FunctionImpl.make(api, "dashboard", "report", ({ backendKey }) =>
  Effect.gen(function* () {
    yield* requireBackendKey(backendKey);

    const reader = yield* DatabaseReader;
    return yield* readReport(reader);
  }),
);

const liveReport = FunctionImpl.make(
  api,
  "dashboard",
  "liveReport",
  ({ dashboardToken }) =>
    Effect.gen(function* () {
      yield* requireDashboardRealtimeToken(dashboardToken);

      const reader = yield* DatabaseReader;
      return yield* readReport(reader);
    }),
);

function readReport(reader: DatabaseReader) {
  return Effect.gen(function* () {
    const callDocs = yield* reader
      .table("calls")
      .index("by_createdAt", "desc")
      .take(100)
      .pipe(Effect.orDie);
    const offerDocs = yield* reader
      .table("offerEvents")
      .index("by_createdAt", "desc")
      .take(100)
      .pipe(Effect.orDie);
    const calls = callDocs.map((call) =>
      Schema.decodeUnknownSync(CallRecord)({
        ...call,
        id: String(call._id),
      }),
    );
    const offers = offerDocs.map((offer) =>
      Schema.decodeUnknownSync(OfferEvent)({
        ...offer,
        id: String(offer._id),
      }),
    );

    return buildDashboardReport(calls, offers);
  });
}

export const dashboard = GroupImpl.make(api, "dashboard").pipe(
  Layer.provide(report),
  Layer.provide(liveReport),
);
