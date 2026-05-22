import { HttpClient } from "@confect/js";
import { Effect } from "effect";
import { readRequiredEnv } from "@/domain/config";
import {
  ConfigError,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors";
import type {
  CallIngestRequest,
  LoadSearchRequest,
  OfferEvaluateRequest,
  VerifyCarrierRequest,
} from "@/domain/schemas";
import refs from "../../confect/_generated/refs";

/** Calls the Convex carrier verification action through Confect. */
export function verifyCarrier(input: VerifyCarrierRequest) {
  return callConfect((client, backendKey) =>
    client.action(refs.public.carriers.verify, { ...input, backendKey }),
  );
}

/** Calls the Convex load search mutation through Confect. */
export function searchLoads(input: LoadSearchRequest) {
  return callConfect((client, backendKey) =>
    client.mutation(refs.public.loads.search, { ...input, backendKey }),
  );
}

/** Calls the Convex offer evaluation mutation through Confect. */
export function evaluateOffer(input: OfferEvaluateRequest) {
  return callConfect((client, backendKey) =>
    client.mutation(refs.public.offers.evaluate, { ...input, backendKey }),
  );
}

/** Calls the Convex final-call ingestion mutation through Confect. */
export function ingestCall(input: CallIngestRequest) {
  return callConfect((client, backendKey) =>
    client.mutation(refs.public.calls.ingest, { ...input, backendKey }),
  );
}

/** Reads dashboard metrics from Convex through Confect. */
export function readDashboardReport() {
  return callConfect((client, backendKey) =>
    client.query(refs.public.dashboard.report, { backendKey }),
  );
}

function callConfect<Success>(
  run: (
    client: HttpClient.HttpClient,
    backendKey: string,
  ) => Effect.Effect<Success, unknown>,
) {
  return Effect.gen(function* () {
    const convexUrl = yield* readRequiredEnv("CONVEX_URL");
    const backendKey = yield* readRequiredEnv("CONVEX_BACKEND_KEY");
    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;

      return yield* run(client, backendKey);
    });

    return yield* program.pipe(
      Effect.provide(HttpClient.layer(convexUrl)),
      Effect.mapError(mapConfectError),
    );
  });
}

function mapConfectError(error: unknown) {
  const tag = errorTag(error);

  if (tag === "BackendValidationError") {
    return new ValidationError({ message: errorMessage(error) });
  }

  if (tag === "BackendNotFoundError") {
    return new NotFoundError({ message: errorMessage(error) });
  }

  if (tag === "BackendExternalError") {
    return new ExternalServiceError({
      message: errorMessage(error),
      status: errorStatus(error),
    });
  }

  if (tag === "BackendAuthError") {
    return new ConfigError({ message: errorMessage(error) });
  }

  return new ExternalServiceError({
    message: "Convex backend request failed.",
  });
}

function errorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "Convex backend request failed.";
  }

  if (typeof error.message !== "string") {
    return "Convex backend request failed.";
  }

  return error.message;
}

function errorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  if (typeof error.status !== "number") {
    return undefined;
  }

  return error.status;
}

function errorTag(error: unknown) {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return undefined;
  }

  if (typeof error._tag !== "string") {
    return undefined;
  }

  return error._tag;
}
