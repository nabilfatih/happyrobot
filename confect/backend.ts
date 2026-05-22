import { Config, Effect } from "effect";
import { normalizeMcNumber } from "../src/domain/carriers";
import { secretsMatch } from "../src/domain/config";
import {
  BackendAuthError,
  BackendExternalError,
  BackendValidationError,
} from "./errors";

/** Returns the current Convex function time as an ISO string. */
export function currentIsoTime() {
  return new Date(Date.now()).toISOString();
}

/** Reads an FMCSA key from Convex environment variables. */
export function readFmcsaWebKey() {
  return Config.string("FMCSA_WEB_KEY").pipe(
    Effect.mapError(
      () =>
        new BackendExternalError({
          message: "FMCSA web key is not configured.",
        }),
    ),
  );
}

/** Validates the server-only key Railway sends to Convex. */
export function requireBackendKey(provided: string) {
  return Config.string("CONVEX_BACKEND_KEY").pipe(
    Effect.mapError(
      () =>
        new BackendAuthError({
          message: "Convex backend key is not configured.",
        }),
    ),
    Effect.flatMap((expected) => {
      if (secretsMatch(provided, expected)) {
        return Effect.void;
      }

      return Effect.fail(
        new BackendAuthError({ message: "Invalid Convex backend key." }),
      );
    }),
  );
}

/** Normalizes and validates an MC number inside Convex functions. */
export function requireBackendMcNumber(value: string) {
  return Effect.gen(function* () {
    const mcNumber = normalizeMcNumber(value);

    if (mcNumber.length < 2) {
      return yield* Effect.fail(
        new BackendValidationError({
          message: "MC number must include at least 2 digits.",
        }),
      );
    }

    return mcNumber;
  });
}
