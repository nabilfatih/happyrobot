import { Schema } from "effect";

const FlexibleNumber = Schema.Union(Schema.Number, Schema.NumberFromString);
const FlexibleBoolean = Schema.Union(Schema.Boolean, Schema.BooleanFromString);
const FlexibleText = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);

export const HappyRobotOfferEvaluateRequest = Schema.Struct({
  loadId: Schema.optional(Schema.String),
  load_id: Schema.optional(Schema.String),
  mcNumber: Schema.optional(Schema.String),
  mc_number: Schema.optional(Schema.String),
  offer_amount: Schema.optional(FlexibleNumber),
  proposedRate: Schema.optional(FlexibleNumber),
  proposed_rate: Schema.optional(FlexibleNumber),
  rate: Schema.optional(FlexibleNumber),
  reference_number: Schema.optional(Schema.String),
  turn: Schema.optional(FlexibleNumber),
  turn_number: Schema.optional(FlexibleNumber),
  negotiation_turn: Schema.optional(FlexibleNumber),
});

export const HappyRobotCallIngestRequest = Schema.Struct({
  agreedRate: Schema.optional(FlexibleNumber),
  agreed_rate: Schema.optional(FlexibleNumber),
  booking_decision: Schema.optional(FlexibleText),
  carrierName: Schema.optional(FlexibleText),
  carrier_name: Schema.optional(FlexibleText),
  classification: Schema.optional(FlexibleText),
  decline_reason: Schema.optional(FlexibleText),
  duration: Schema.optional(Schema.Unknown),
  loadId: Schema.optional(FlexibleText),
  load_id: Schema.optional(FlexibleText),
  loadboardRate: Schema.optional(FlexibleNumber),
  loadboard_rate: Schema.optional(FlexibleNumber),
  mcNumber: Schema.optional(FlexibleText),
  mc_number: Schema.optional(FlexibleText),
  negotiationTurns: Schema.optional(FlexibleNumber),
  negotiation_turns: Schema.optional(FlexibleNumber),
  outcome: Schema.optional(FlexibleText),
  reference_number: Schema.optional(FlexibleText),
  sentiment: Schema.optional(FlexibleText),
  sentiment_label: Schema.optional(FlexibleText),
  summary: Schema.optional(FlexibleText),
  transcript: Schema.optional(Schema.Unknown),
  transferMocked: Schema.optional(FlexibleBoolean),
  transfer_mocked: Schema.optional(FlexibleBoolean),
});

export type HappyRobotCallIngestRequest = Schema.Schema.Type<
  typeof HappyRobotCallIngestRequest
>;
export type HappyRobotOfferEvaluateRequest = Schema.Schema.Type<
  typeof HappyRobotOfferEvaluateRequest
>;
