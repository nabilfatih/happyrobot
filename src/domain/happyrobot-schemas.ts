import { Schema } from "effect";

const FlexibleNumber = Schema.Union(Schema.Number, Schema.NumberFromString);
const FlexibleBoolean = Schema.Union(Schema.Boolean, Schema.BooleanFromString);

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
  booking_decision: Schema.optional(Schema.String),
  carrierName: Schema.optional(Schema.String),
  carrier_name: Schema.optional(Schema.String),
  classification: Schema.optional(Schema.String),
  decline_reason: Schema.optional(Schema.String),
  duration: Schema.optional(FlexibleNumber),
  loadId: Schema.optional(Schema.String),
  load_id: Schema.optional(Schema.String),
  loadboardRate: Schema.optional(FlexibleNumber),
  loadboard_rate: Schema.optional(FlexibleNumber),
  mcNumber: Schema.optional(Schema.String),
  mc_number: Schema.optional(Schema.String),
  negotiationTurns: Schema.optional(FlexibleNumber),
  negotiation_turns: Schema.optional(FlexibleNumber),
  outcome: Schema.optional(Schema.String),
  reference_number: Schema.optional(Schema.String),
  sentiment: Schema.optional(Schema.String),
  sentiment_label: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  transcript: Schema.optional(Schema.String),
  transferMocked: Schema.optional(FlexibleBoolean),
  transfer_mocked: Schema.optional(FlexibleBoolean),
});

export type HappyRobotCallIngestRequest = Schema.Schema.Type<
  typeof HappyRobotCallIngestRequest
>;
export type HappyRobotOfferEvaluateRequest = Schema.Schema.Type<
  typeof HappyRobotOfferEvaluateRequest
>;
