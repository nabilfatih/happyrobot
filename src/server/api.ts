import { Effect, Schema } from "effect";
import {
  describeCarrierStatus,
  fetchCarrierFromFmcsa,
  requireMcNumber,
} from "@/domain/carriers";
import { readRequiredEnv, secretsMatch } from "@/domain/config";
import {
  AuthError,
  type ConfigError,
  type ExternalServiceError,
  NotFoundError,
  type RateLimitError,
  ValidationError,
} from "@/domain/errors";
import { searchLoads, summarizeLoad } from "@/domain/loads";
import { evaluateOffer, explainOfferDecision } from "@/domain/offers";
import {
  CallIngestRequest,
  LoadSearchRequest,
  OfferEvaluateRequest,
  VerifyCarrierRequest,
} from "@/domain/schemas";
import {
  findCachedCarrier,
  recordCall,
  recordOfferEvent,
  saveCachedCarrier,
} from "./database";
import { checkRateLimit, requestRateLimitKey } from "./rate-limit";
import { securityHeaders } from "./security-headers";

type KnownApiError =
  | AuthError
  | ConfigError
  | ExternalServiceError
  | NotFoundError
  | RateLimitError
  | ValidationError;

/** Runs an API Effect and maps domain errors into stable JSON responses. */
export async function runApi(program: Effect.Effect<unknown, KnownApiError>) {
  return Effect.runPromise(
    Effect.match(program, {
      onFailure: errorToResponse,
      onSuccess: (body) => Response.json(body, { headers: securityHeaders }),
    }),
  );
}

/** Handles the HappyRobot carrier eligibility lookup endpoint. */
export function verifyCarrierProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input =
      yield* Schema.decodeUnknown(VerifyCarrierRequest)(body).pipe(
        mapParseError,
      );
    const mcNumber = yield* requireMcNumber(input.mcNumber);
    const cached = yield* Effect.sync(() => findCachedCarrier(mcNumber));

    if (cached) {
      return {
        cacheHit: true,
        carrier: cached,
        message: describeCarrierStatus(cached),
      };
    }

    const webKey = yield* readRequiredEnv("FMCSA_WEB_KEY");
    const carrier = yield* fetchCarrierFromFmcsa(mcNumber, webKey);
    yield* Effect.sync(() => saveCachedCarrier(carrier));

    return {
      cacheHit: false,
      carrier,
      message: describeCarrierStatus(carrier),
    };
  });
}

/** Handles the HappyRobot load search endpoint. */
export function searchLoadsProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input =
      yield* Schema.decodeUnknown(LoadSearchRequest)(body).pipe(mapParseError);
    const result = searchLoads(input);

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
  });
}

/** Handles the HappyRobot offer evaluation endpoint. */
export function evaluateOfferProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input =
      yield* Schema.decodeUnknown(OfferEvaluateRequest)(body).pipe(
        mapParseError,
      );
    const mcNumber = yield* requireMcNumber(input.mcNumber);
    const result = yield* Effect.try({
      try: () => evaluateOffer(input.loadId, input.proposedRate, input.turn),
      catch: (error) =>
        error instanceof NotFoundError
          ? error
          : new ValidationError({ message: "Offer could not be evaluated." }),
    });

    const event = yield* Effect.sync(() =>
      recordOfferEvent({
        acceptedRate: result.acceptedRate,
        counterRate: result.counterRate,
        decision: result.decision,
        loadId: input.loadId,
        mcNumber,
        proposedRate: input.proposedRate,
        turn: input.turn,
      }),
    );

    return {
      ...result,
      eventId: event.id,
      message: explainOfferDecision(result),
    };
  });
}

/** Handles the final HappyRobot call extraction webhook. */
export function ingestCallProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input =
      yield* Schema.decodeUnknown(CallIngestRequest)(body).pipe(mapParseError);
    const call = yield* Effect.sync(() => recordCall(input));

    return {
      callId: call.id,
      stored: true,
    };
  });
}

function errorToResponse(error: KnownApiError) {
  if (error._tag === "AuthError") {
    return Response.json(
      { error: error.message },
      { headers: securityHeaders, status: 401 },
    );
  }

  if (error._tag === "ValidationError") {
    return Response.json(
      { error: error.message },
      { headers: securityHeaders, status: 400 },
    );
  }

  if (error._tag === "NotFoundError") {
    return Response.json(
      { error: error.message },
      { headers: securityHeaders, status: 404 },
    );
  }

  if (error._tag === "RateLimitError") {
    return Response.json(
      { error: error.message },
      { headers: securityHeaders, status: 429 },
    );
  }

  if (error._tag === "ExternalServiceError") {
    return Response.json(
      { error: error.message, upstreamStatus: error.status },
      { headers: securityHeaders, status: 502 },
    );
  }

  return Response.json(
    { error: error.message },
    { headers: securityHeaders, status: 500 },
  );
}

function mapParseError<Success>(effect: Effect.Effect<Success, unknown>) {
  return effect.pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          message: "Request body did not match the expected schema.",
        }),
    ),
  );
}

function readJson(request: Request) {
  return Effect.tryPromise({
    try: () => request.json(),
    catch: () =>
      new ValidationError({ message: "Request body must be valid JSON." }),
  });
}

function requireApiKey(request: Request) {
  return Effect.gen(function* () {
    yield* checkRateLimit(requestRateLimitKey(request, "api"), 120, 60_000);
    const expected = yield* readRequiredEnv("HAPPYROBOT_API_KEY");
    const provided = request.headers.get("x-api-key");

    if (!provided || !secretsMatch(provided, expected)) {
      return yield* Effect.fail(new AuthError({ message: "Invalid API key." }));
    }
  });
}
