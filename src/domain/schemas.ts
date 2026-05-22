import { Schema } from "effect";

export const Outcome = Schema.Literal(
  "booked",
  "not_interested",
  "ineligible_carrier",
  "no_matching_load",
  "no_agreement",
  "transferred",
  "incomplete",
);

export const Sentiment = Schema.Literal(
  "positive",
  "neutral",
  "negative",
  "mixed",
);

export const OfferDecision = Schema.Literal("accept", "counter", "reject");

export const Load = Schema.Struct({
  load_id: Schema.String,
  origin: Schema.String,
  destination: Schema.String,
  pickup_datetime: Schema.String,
  delivery_datetime: Schema.String,
  equipment_type: Schema.String,
  loadboard_rate: Schema.Number,
  notes: Schema.String,
  weight: Schema.Number,
  commodity_type: Schema.String,
  num_of_pieces: Schema.Number,
  miles: Schema.Number,
  dimensions: Schema.String,
});

export const VerifyCarrierRequest = Schema.Struct({
  mcNumber: Schema.String,
});

export const LoadSearchRequest = Schema.Struct({
  origin: Schema.optional(Schema.String),
  destination: Schema.optional(Schema.String),
  equipmentType: Schema.optional(Schema.String),
  pickupDate: Schema.optional(Schema.String),
  maxWeight: Schema.optional(Schema.Number),
});

export const OfferInput = Schema.Struct({
  rate: Schema.Number,
  turn: Schema.Number,
});

export const OfferEvaluateRequest = Schema.Struct({
  loadId: Schema.String,
  mcNumber: Schema.String,
  proposedRate: Schema.Number,
  turn: Schema.Number,
});

export const CallIngestRequest = Schema.Struct({
  mcNumber: Schema.String,
  carrierName: Schema.optional(Schema.String),
  loadId: Schema.optional(Schema.String),
  loadboardRate: Schema.optional(Schema.Number),
  agreedRate: Schema.optional(Schema.Number),
  outcome: Outcome,
  sentiment: Sentiment,
  negotiationTurns: Schema.Number,
  transferMocked: Schema.Boolean,
  summary: Schema.String,
  offers: Schema.optional(Schema.Array(OfferInput)),
});

const FmcsaValue = Schema.Union(Schema.String, Schema.Number, Schema.Null);

export const FmcsaCarrier = Schema.Struct({
  allowToOperate: Schema.optional(FmcsaValue),
  outOfService: Schema.optional(FmcsaValue),
  dotNumber: Schema.optional(FmcsaValue),
  mcNumber: Schema.optional(FmcsaValue),
  legalName: Schema.optional(FmcsaValue),
  dbaName: Schema.optional(FmcsaValue),
});

export const FmcsaResponse = Schema.Struct({
  content: Schema.Union(FmcsaCarrier, Schema.Array(FmcsaCarrier)),
});

export const CachedCarrier = Schema.Struct({
  mcNumber: Schema.String,
  eligible: Schema.Boolean,
  legalName: Schema.optional(Schema.String),
  dbaName: Schema.optional(Schema.String),
  dotNumber: Schema.optional(Schema.String),
  allowToOperate: Schema.String,
  outOfService: Schema.String,
  checkedAt: Schema.String,
});

export const CallRecord = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  mcNumber: Schema.String,
  carrierName: Schema.optional(Schema.String),
  loadId: Schema.optional(Schema.String),
  loadboardRate: Schema.optional(Schema.Number),
  agreedRate: Schema.optional(Schema.Number),
  outcome: Outcome,
  sentiment: Sentiment,
  negotiationTurns: Schema.Number,
  transferMocked: Schema.Boolean,
  summary: Schema.String,
  offers: Schema.Array(OfferInput),
});

export const OfferEvent = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  mcNumber: Schema.String,
  loadId: Schema.String,
  proposedRate: Schema.Number,
  turn: Schema.Number,
  decision: OfferDecision,
  counterRate: Schema.optional(Schema.Number),
  acceptedRate: Schema.optional(Schema.Number),
});

export const OfferEventInput = Schema.Struct({
  mcNumber: Schema.String,
  loadId: Schema.String,
  proposedRate: Schema.Number,
  turn: Schema.Number,
  decision: OfferDecision,
  counterRate: Schema.optional(Schema.Number),
  acceptedRate: Schema.optional(Schema.Number),
});

export type CachedCarrier = Schema.Schema.Type<typeof CachedCarrier>;
export type CallIngestRequest = Schema.Schema.Type<typeof CallIngestRequest>;
export type CallRecord = Schema.Schema.Type<typeof CallRecord>;
export type FmcsaCarrier = Schema.Schema.Type<typeof FmcsaCarrier>;
export type Load = Schema.Schema.Type<typeof Load>;
export type LoadSearchRequest = Schema.Schema.Type<typeof LoadSearchRequest>;
export type OfferDecision = Schema.Schema.Type<typeof OfferDecision>;
export type OfferEvent = Schema.Schema.Type<typeof OfferEvent>;
export type OfferEventInput = Schema.Schema.Type<typeof OfferEventInput>;
export type OfferInput = Schema.Schema.Type<typeof OfferInput>;
export type Outcome = Schema.Schema.Type<typeof Outcome>;
export type Sentiment = Schema.Schema.Type<typeof Sentiment>;
