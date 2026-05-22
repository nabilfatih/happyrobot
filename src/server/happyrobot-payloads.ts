import { Effect, Schema } from "effect";
import { ValidationError } from "@/domain/errors";
import {
  type HappyRobotCallIngestRequest as HappyRobotCallIngestInput,
  HappyRobotCallIngestRequest,
  type HappyRobotOfferEvaluateRequest as HappyRobotOfferEvaluateInput,
  HappyRobotOfferEvaluateRequest,
} from "@/domain/happyrobot-schemas";
import {
  CallIngestRequest,
  OfferEvaluateRequest,
  type Outcome,
  type Sentiment,
} from "@/domain/schemas";

/** Decodes canonical or HappyRobot-shaped offer payloads into app input. */
export function decodeOfferEvaluateBody(body: unknown) {
  return Schema.decodeUnknown(OfferEvaluateRequest)(body).pipe(
    Effect.orElse(() =>
      Schema.decodeUnknown(HappyRobotOfferEvaluateRequest)(body).pipe(
        Effect.flatMap(normalizeHappyRobotOffer),
      ),
    ),
    mapPayloadError,
  );
}

/** Decodes canonical or HappyRobot-shaped call payloads into app input. */
export function decodeCallIngestBody(body: unknown) {
  return Schema.decodeUnknown(CallIngestRequest)(body).pipe(
    Effect.orElse(() =>
      Schema.decodeUnknown(HappyRobotCallIngestRequest)(body).pipe(
        Effect.flatMap(normalizeHappyRobotCall),
      ),
    ),
    mapPayloadError,
  );
}

function normalizeHappyRobotOffer(input: HappyRobotOfferEvaluateInput) {
  const loadId = cleanText(
    input.loadId ?? input.load_id ?? input.reference_number,
  );
  const mcNumber = cleanText(input.mcNumber ?? input.mc_number);
  const proposedRate =
    input.proposedRate ??
    input.proposed_rate ??
    input.offer_amount ??
    input.rate;
  const turn = input.turn ?? input.turn_number ?? input.negotiation_turn ?? 1;

  if (!loadId || !mcNumber || proposedRate === undefined) {
    return Effect.fail(
      new ValidationError({
        message: "Offer payload is missing load, MC, or rate fields.",
      }),
    );
  }

  return Effect.succeed({
    loadId,
    mcNumber,
    proposedRate,
    turn,
  });
}

function normalizeHappyRobotCall(input: HappyRobotCallIngestInput) {
  const mcNumber = cleanText(input.mcNumber ?? input.mc_number);

  if (!mcNumber) {
    return Effect.fail(
      new ValidationError({ message: "Call payload is missing MC number." }),
    );
  }

  const outcome = normalizeOutcome(
    input.outcome ?? input.classification ?? input.booking_decision,
  );
  const fallbackTransferMocked =
    outcome === "booked" || outcome === "transferred";

  return Effect.succeed({
    agreedRate: input.agreedRate ?? input.agreed_rate,
    carrierName: cleanText(input.carrierName ?? input.carrier_name),
    loadId: cleanText(input.loadId ?? input.load_id ?? input.reference_number),
    loadboardRate: input.loadboardRate ?? input.loadboard_rate,
    mcNumber,
    negotiationTurns: input.negotiationTurns ?? input.negotiation_turns ?? 0,
    offers: [],
    outcome,
    sentiment: normalizeSentiment(input.sentiment ?? input.sentiment_label),
    summary: callSummary(input),
    transferMocked:
      input.transferMocked ?? input.transfer_mocked ?? fallbackTransferMocked,
  });
}

function callSummary(input: HappyRobotCallIngestInput) {
  const directSummary = cleanText(input.summary);

  if (directSummary) {
    return directSummary;
  }

  const declineReason = cleanText(input.decline_reason);

  if (declineReason) {
    return declineReason;
  }

  const transcript = cleanText(input.transcript);

  if (transcript) {
    return transcript.slice(0, 240);
  }

  return "HappyRobot call completed.";
}

function normalizeOutcome(value: string | undefined): Outcome {
  const label = normalizedLabel(value);

  if (!label) {
    return "incomplete";
  }

  if (label.includes("ineligible")) {
    return "ineligible_carrier";
  }

  if (label.includes("no_matching") || label.includes("no_match")) {
    return "no_matching_load";
  }

  if (label.includes("not_interested")) {
    return "not_interested";
  }

  if (label.includes("no_agreement") || label.includes("declined")) {
    return "no_agreement";
  }

  if (label.includes("transfer")) {
    return "transferred";
  }

  if (label.includes("book") || label.includes("accept")) {
    return "booked";
  }

  return "incomplete";
}

function normalizeSentiment(value: string | undefined): Sentiment {
  const label = normalizedLabel(value);

  if (label.includes("positive")) {
    return "positive";
  }

  if (label.includes("negative")) {
    return "negative";
  }

  if (label.includes("mixed")) {
    return "mixed";
  }

  return "neutral";
}

function normalizedLabel(value: string | undefined) {
  return (
    cleanText(value)
      ?.toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "_") ?? ""
  );
}

function cleanText(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function mapPayloadError<Success>(effect: Effect.Effect<Success, unknown>) {
  return effect.pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          message: "Request body did not match the expected schema.",
        }),
    ),
  );
}
