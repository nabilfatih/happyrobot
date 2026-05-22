import { Effect, Schema } from "effect";
import { ExternalServiceError, ValidationError } from "./errors";
import {
  CachedCarrier,
  type CachedCarrier as CachedCarrierType,
  type FmcsaCarrier as FmcsaCarrierType,
  FmcsaResponse,
} from "./schemas";

const fmcsaBaseUrl = "https://mobile.fmcsa.dot.gov/qc/services";

/** Normalizes spoken or typed MC numbers to the digits FMCSA expects. */
export function normalizeMcNumber(value: string) {
  return value.replace(/\D/g, "");
}

/** Validates that an MC number can be safely sent to FMCSA. */
export function requireMcNumber(value: string) {
  const mcNumber = normalizeMcNumber(value);

  if (mcNumber.length < 2) {
    return Effect.fail(
      new ValidationError({
        message: "MC number must include at least 2 digits.",
      }),
    );
  }

  return Effect.succeed(mcNumber);
}

/** Maps an FMCSA carrier record to the eligibility result used by the agent. */
export function mapFmcsaCarrier(mcNumber: string, carrier: FmcsaCarrierType) {
  const allowToOperate = textValue(carrier.allowToOperate).toUpperCase();
  const outOfService = textValue(carrier.outOfService).toUpperCase();

  return Schema.decodeUnknownSync(CachedCarrier)({
    mcNumber,
    eligible: allowToOperate === "Y" && outOfService !== "Y",
    legalName: optionalText(carrier.legalName),
    dbaName: optionalText(carrier.dbaName),
    dotNumber: optionalText(carrier.dotNumber),
    allowToOperate,
    outOfService,
    checkedAt: new Date().toISOString(),
  });
}

/** Calls FMCSA QCMobile by MC number and returns a normalized eligibility result. */
export function fetchCarrierFromFmcsa(mcNumber: string, webKey: string) {
  return Effect.gen(function* () {
    const url = `${fmcsaBaseUrl}/carriers/docket-number/${mcNumber}/?webKey=${webKey}`;
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url, {
          headers: {
            accept: "application/json",
            "user-agent": "Acme Logistics FDE demo",
          },
        }),
      catch: () =>
        new ExternalServiceError({
          message: "FMCSA lookup could not be reached.",
        }),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new ExternalServiceError({
          message: "FMCSA lookup returned an unsuccessful response.",
          status: response.status,
        }),
      );
    }

    const payload = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () =>
        new ExternalServiceError({
          message: "FMCSA lookup did not return JSON.",
        }),
    });

    const parsed = yield* Schema.decodeUnknown(FmcsaResponse)(payload).pipe(
      Effect.mapError(
        () =>
          new ExternalServiceError({
            message: "FMCSA lookup returned an unexpected carrier shape.",
          }),
      ),
    );
    const carrier = firstCarrier(parsed.content);

    if (!carrier) {
      return yield* Effect.fail(
        new ExternalServiceError({
          message: "FMCSA lookup did not find a carrier.",
        }),
      );
    }

    return mapFmcsaCarrier(mcNumber, carrier);
  });
}

/** Formats a carrier into a short sentence the voice agent can speak. */
export function describeCarrierStatus(carrier: CachedCarrierType) {
  if (carrier.eligible) {
    return `${carrier.legalName ?? "The carrier"} is eligible with active operating authority.`;
  }

  return `${carrier.legalName ?? "The carrier"} is not eligible for this automated load booking flow.`;
}

function firstCarrier(
  content: FmcsaCarrierType | ReadonlyArray<FmcsaCarrierType>,
) {
  if (Array.isArray(content)) {
    return content[0];
  }

  return content;
}

function optionalText(value: FmcsaCarrierType[keyof FmcsaCarrierType]) {
  const text = textValue(value);

  if (!text) {
    return undefined;
  }

  return text;
}

function textValue(value: FmcsaCarrierType[keyof FmcsaCarrierType]) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}
