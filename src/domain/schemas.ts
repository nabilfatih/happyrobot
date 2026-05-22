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

const backendKeyField = {
  backendKey: Schema.String,
};

export const VerifyCarrierRequest = Schema.Struct({
  mcNumber: Schema.String,
});

export const VerifyCarrierArgs = Schema.Struct({
  ...backendKeyField,
  mcNumber: Schema.String,
});

export const LoadSearchRequest = Schema.Struct({
  origin: Schema.optional(Schema.String),
  destination: Schema.optional(Schema.String),
  equipmentType: Schema.optional(Schema.String),
  pickupDate: Schema.optional(Schema.String),
  maxWeight: Schema.optional(Schema.Number),
});

export const LoadSearchArgs = Schema.Struct({
  ...backendKeyField,
  ...LoadSearchRequest.fields,
});

export const LoadSearchResponse = Schema.Struct({
  alternatives: Schema.Array(Load),
  matched: Schema.Boolean,
  pitch: Schema.optional(Schema.String),
  selected: Schema.NullOr(Load),
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

export const OfferEvaluateArgs = Schema.Struct({
  ...backendKeyField,
  ...OfferEvaluateRequest.fields,
});

export const OfferEvaluateResponse = Schema.Struct({
  acceptedRate: Schema.optional(Schema.Number),
  counterRate: Schema.optional(Schema.Number),
  decision: OfferDecision,
  eventId: Schema.String,
  maxRate: Schema.Number,
  message: Schema.String,
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

export const CallIngestArgs = Schema.Struct({
  ...backendKeyField,
  ...CallIngestRequest.fields,
});

export const CallIngestResponse = Schema.Struct({
  callId: Schema.String,
  stored: Schema.Boolean,
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

export const VerifyCarrierResponse = Schema.Struct({
  cacheHit: Schema.Boolean,
  carrier: CachedCarrier,
  message: Schema.String,
});

const storedCallFields = {
  agreedRate: Schema.optional(Schema.Number),
  carrierName: Schema.optional(Schema.String),
  createdAt: Schema.String,
  loadboardRate: Schema.optional(Schema.Number),
  loadId: Schema.optional(Schema.String),
  mcNumber: Schema.String,
  negotiationTurns: Schema.Number,
  offers: Schema.Array(OfferInput),
  outcome: Outcome,
  sentiment: Sentiment,
  summary: Schema.String,
  transferMocked: Schema.Boolean,
};

export const StoredCall = Schema.Struct(storedCallFields);

export const CallRecord = Schema.Struct({
  id: Schema.String,
  ...storedCallFields,
});

const storedOfferEventFields = {
  acceptedRate: Schema.optional(Schema.Number),
  counterRate: Schema.optional(Schema.Number),
  createdAt: Schema.String,
  decision: OfferDecision,
  loadId: Schema.String,
  mcNumber: Schema.String,
  proposedRate: Schema.Number,
  turn: Schema.Number,
};

export const StoredOfferEvent = Schema.Struct(storedOfferEventFields);

export const OfferEventInput = Schema.Struct({
  mcNumber: Schema.String,
  loadId: Schema.String,
  proposedRate: Schema.Number,
  turn: Schema.Number,
  decision: OfferDecision,
  counterRate: Schema.optional(Schema.Number),
  acceptedRate: Schema.optional(Schema.Number),
});

export const OfferEvent = Schema.Struct({
  id: Schema.String,
  ...storedOfferEventFields,
});

const DistributionEntry = Schema.Struct({
  count: Schema.Number,
  key: Schema.String,
});

const DailyConversionEntry = Schema.Struct({
  booked: Schema.Number,
  calls: Schema.Number,
  date: Schema.String,
});

export const DashboardReport = Schema.Struct({
  agreementRate: Schema.Number,
  averageAgreedDelta: Schema.Number,
  dailyConversion: Schema.Array(DailyConversionEntry),
  eligibleRate: Schema.Number,
  matchedLoadRate: Schema.Number,
  outcomeDistribution: Schema.Array(DistributionEntry),
  recentCalls: Schema.Array(CallRecord),
  recentOffers: Schema.Array(OfferEvent),
  sentimentDistribution: Schema.Array(DistributionEntry),
  totalCalls: Schema.Number,
  transferMockedCount: Schema.Number,
});

export const DashboardReportArgs = Schema.Struct({
  ...backendKeyField,
});

export type CallIngestArgs = Schema.Schema.Type<typeof CallIngestArgs>;
export type CachedCarrier = Schema.Schema.Type<typeof CachedCarrier>;
export type CallIngestRequest = Schema.Schema.Type<typeof CallIngestRequest>;
export type CallRecord = Schema.Schema.Type<typeof CallRecord>;
export type DashboardReport = Schema.Schema.Type<typeof DashboardReport>;
export type FmcsaCarrier = Schema.Schema.Type<typeof FmcsaCarrier>;
export type Load = Schema.Schema.Type<typeof Load>;
export type LoadSearchArgs = Schema.Schema.Type<typeof LoadSearchArgs>;
export type LoadSearchRequest = Schema.Schema.Type<typeof LoadSearchRequest>;
export type OfferDecision = Schema.Schema.Type<typeof OfferDecision>;
export type OfferEvaluateArgs = Schema.Schema.Type<typeof OfferEvaluateArgs>;
export type OfferEvaluateRequest = Schema.Schema.Type<
  typeof OfferEvaluateRequest
>;
export type OfferEvent = Schema.Schema.Type<typeof OfferEvent>;
export type OfferEventInput = Schema.Schema.Type<typeof OfferEventInput>;
export type OfferInput = Schema.Schema.Type<typeof OfferInput>;
export type Outcome = Schema.Schema.Type<typeof Outcome>;
export type Sentiment = Schema.Schema.Type<typeof Sentiment>;
export type StoredCall = Schema.Schema.Type<typeof StoredCall>;
export type StoredOfferEvent = Schema.Schema.Type<typeof StoredOfferEvent>;
export type VerifyCarrierRequest = Schema.Schema.Type<
  typeof VerifyCarrierRequest
>;
