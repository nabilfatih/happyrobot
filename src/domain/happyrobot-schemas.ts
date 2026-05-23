import { Schema } from "effect";

const FlexibleNumber = Schema.Union(Schema.Number, Schema.NumberFromString);
const FlexibleBoolean = Schema.Union(Schema.Boolean, Schema.BooleanFromString);
const FlexibleText = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);

/** Payload emitted by the HappyRobot offer-evaluation webhook node. */
export const HappyRobotOfferEvaluateRequest = Schema.Struct({
  mc_number: Schema.optional(Schema.String),
  offer_amount: Schema.optional(FlexibleNumber),
  reference_number: Schema.optional(Schema.String),
  turn: Schema.optional(FlexibleNumber),
});

/** Payload emitted by the final HappyRobot call-ingestion webhook node. */
export const HappyRobotCallIngestRequest = Schema.Struct({
  agreed_rate: Schema.optional(FlexibleNumber),
  booking_decision: Schema.optional(FlexibleText),
  carrier_name: Schema.optional(FlexibleText),
  classification: Schema.optional(FlexibleText),
  decline_reason: Schema.optional(FlexibleText),
  loadboard_rate: Schema.optional(FlexibleNumber),
  mc_number: Schema.optional(FlexibleText),
  negotiation_turns: Schema.optional(FlexibleNumber),
  reference_number: Schema.optional(FlexibleText),
  sentiment: Schema.optional(FlexibleText),
  summary: Schema.optional(FlexibleText),
  transcript: Schema.optional(Schema.Unknown),
  transfer_mocked: Schema.optional(FlexibleBoolean),
});

export type HappyRobotCallIngestRequest = Schema.Schema.Type<
  typeof HappyRobotCallIngestRequest
>;
export type HappyRobotOfferEvaluateRequest = Schema.Schema.Type<
  typeof HappyRobotOfferEvaluateRequest
>;
