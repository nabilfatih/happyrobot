import { Effect, Schema } from "effect";
import { readRequiredEnv, secretsMatch } from "@/domain/config";
import {
  AuthError,
  type ConfigError,
  type ExternalServiceError,
  type NotFoundError,
  type RateLimitError,
  ValidationError,
} from "@/domain/errors";
import { LoadSearchRequest, VerifyCarrierRequest } from "@/domain/schemas";
import {
  evaluateOffer,
  ingestCall,
  searchLoads,
  verifyCarrier,
} from "./backend";
import {
  decodeCallIngestBody,
  decodeOfferEvaluateBody,
} from "./happyrobot-payloads";
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

    return yield* verifyCarrier(input);
  });
}

/** Handles HappyRobot query-style carrier verification webhook calls. */
export function verifyCarrierQueryProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const input = yield* Schema.decodeUnknown(VerifyCarrierRequest)(
      carrierQueryInput(request),
    ).pipe(mapParseError);

    return yield* verifyCarrier(input);
  });
}

/** Handles the HappyRobot load search endpoint. */
export function searchLoadsProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input =
      yield* Schema.decodeUnknown(LoadSearchRequest)(body).pipe(mapParseError);

    return yield* searchLoads(input);
  });
}

/** Handles HappyRobot query-style load search webhook calls. */
export function searchLoadsQueryProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const input = yield* Schema.decodeUnknown(LoadSearchRequest)(
      loadSearchQueryInput(request),
    ).pipe(mapParseError);

    return yield* searchLoads(input);
  });
}

/** Handles the HappyRobot offer evaluation endpoint. */
export function evaluateOfferProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input = yield* decodeOfferEvaluateBody(body);

    return yield* evaluateOffer(input);
  });
}

/** Handles the final HappyRobot call extraction webhook. */
export function ingestCallProgram(request: Request) {
  return Effect.gen(function* () {
    yield* requireApiKey(request);
    const body = yield* readJson(request);
    const input = yield* decodeCallIngestBody(body);

    return yield* ingestCall(input);
  });
}

function carrierQueryInput(request: Request) {
  const params = new URL(request.url).searchParams;

  return {
    mcNumber: params.get("mcNumber") ?? params.get("mc_number") ?? "",
  };
}

function loadSearchQueryInput(request: Request) {
  const params = new URL(request.url).searchParams;
  const maxWeight = optionalNumber(
    params.get("maxWeight") ?? params.get("max_weight") ?? params.get("weight"),
  );

  return {
    destination: optionalText(
      params.get("destination") ?? params.get("destination_city"),
    ),
    equipmentType: optionalText(
      params.get("equipmentType") ??
        params.get("equipment_type") ??
        params.get("trailer_type"),
    ),
    maxWeight,
    origin: optionalText(params.get("origin") ?? params.get("origin_city")),
    pickupDate: optionalText(
      params.get("pickupDate") ?? params.get("pickup_date"),
    ),
  };
}

function optionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function optionalText(value: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
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

    if (!provided || !apiKeyMatches(provided, expected)) {
      return yield* Effect.fail(new AuthError({ message: "Invalid API key." }));
    }
  });
}

function apiKeyMatches(provided: string, expected: string) {
  return expected
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .some((key) => secretsMatch(provided, key));
}
