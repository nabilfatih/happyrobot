import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer } from "effect";
import { evaluateLoadOffer, explainOfferDecision } from "../src/domain/offers";
import api from "./_generated/api";
import { DatabaseReader, DatabaseWriter } from "./_generated/services";
import {
  currentIsoTime,
  requireBackendKey,
  requireBackendMcNumber,
} from "./backend";
import { BackendNotFoundError } from "./errors";
import { seedLoads } from "./load-seed";

const evaluate = FunctionImpl.make(api, "offers", "evaluate", (input) =>
  Effect.gen(function* () {
    yield* requireBackendKey(input.backendKey);

    const mcNumber = yield* requireBackendMcNumber(input.mcNumber);
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    yield* seedLoads(reader, writer).pipe(Effect.orDie);

    const load = yield* reader
      .table("loads")
      .get("by_load_id", input.loadId)
      .pipe(
        Effect.mapError(
          () =>
            new BackendNotFoundError({
              message: `Load ${input.loadId} was not found.`,
            }),
        ),
      );
    const result = evaluateLoadOffer(load, input.proposedRate, input.turn);
    const eventId = yield* writer
      .table("offerEvents")
      .insert({
        acceptedRate: result.acceptedRate,
        counterRate: result.counterRate,
        createdAt: currentIsoTime(),
        decision: result.decision,
        loadId: input.loadId,
        mcNumber,
        proposedRate: input.proposedRate,
        turn: input.turn,
      })
      .pipe(Effect.orDie);

    return {
      ...result,
      eventId: String(eventId),
      message: explainOfferDecision(result),
    };
  }),
);

export const offers = GroupImpl.make(api, "offers").pipe(
  Layer.provide(evaluate),
);
