import { NotFoundError } from "#/domain/errors";
import { findLoad } from "#/domain/loads";
import type { Load, OfferDecision } from "#/domain/schemas";

const maxNegotiationTurns = 3;
const targetPremium = 1.08;
const unrealisticPremium = 1.3;

/** Rounds money to the nearest broker-friendly $25 increment. */
export function roundTo25(value: number) {
  return Math.round(value / 25) * 25;
}

/** Evaluates a carrier counteroffer against the selected load's negotiation policy. */
export function evaluateOffer(
  loadId: string,
  proposedRate: number,
  turn: number,
) {
  const load = findLoad(loadId);

  if (!load) {
    throw new NotFoundError({ message: `Load ${loadId} was not found.` });
  }

  return evaluateLoadOffer(load, proposedRate, turn);
}

/** Evaluates a carrier counteroffer against a caller-provided load record. */
export function evaluateLoadOffer(
  load: Load,
  proposedRate: number,
  turn: number,
) {
  const maxRate = roundTo25(load.loadboard_rate * targetPremium);
  const unrealisticRate = roundTo25(load.loadboard_rate * unrealisticPremium);

  if (proposedRate <= maxRate) {
    return offerResult("accept", maxRate, undefined, proposedRate);
  }

  if (turn >= maxNegotiationTurns || proposedRate > unrealisticRate) {
    return offerResult("reject", maxRate);
  }

  return offerResult("counter", maxRate, maxRate);
}

/** Builds the short explanation returned to HappyRobot after each negotiation turn. */
export function explainOfferDecision(
  result: ReturnType<typeof evaluateLoadOffer>,
) {
  if (result.decision === "accept") {
    return `Accepted at $${result.acceptedRate?.toLocaleString()}. Transfer was successful and now you can wrap up the conversation.`;
  }

  if (result.decision === "counter") {
    return `Counter at $${result.counterRate?.toLocaleString()} all-in. Ask if the carrier can accept that rate.`;
  }

  return "Reject the offer politely and let the carrier know we cannot make the numbers work on this load.";
}

function offerResult(
  decision: OfferDecision,
  maxRate: number,
  counterRate?: number,
  acceptedRate?: number,
) {
  return {
    acceptedRate,
    counterRate,
    decision,
    maxRate,
  };
}
