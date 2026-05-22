import type { CallRecord, OfferEvent, Outcome, Sentiment } from "./schemas";

const outcomes = [
  "booked",
  "not_interested",
  "ineligible_carrier",
  "no_matching_load",
  "no_agreement",
  "transferred",
  "incomplete",
] as const satisfies ReadonlyArray<Outcome>;

const sentiments = [
  "positive",
  "neutral",
  "negative",
  "mixed",
] as const satisfies ReadonlyArray<Sentiment>;

/** Aggregates dashboard metrics from stored call and offer records. */
export function buildDashboardReport(
  calls: ReadonlyArray<CallRecord>,
  offers: ReadonlyArray<OfferEvent>,
) {
  const bookedCalls = calls.filter((call) => call.outcome === "booked");
  const matchedCalls = calls.filter((call) => call.loadId);
  const eligibleCalls = calls.filter(
    (call) => call.outcome !== "ineligible_carrier",
  );
  const agreedDeltas = bookedCalls
    .filter((call) => call.agreedRate && call.loadboardRate)
    .map((call) => (call.agreedRate ?? 0) - (call.loadboardRate ?? 0));

  return {
    averageAgreedDelta: average(agreedDeltas),
    dailyConversion: buildDailyConversion(calls),
    eligibleRate: ratio(eligibleCalls.length, calls.length),
    matchedLoadRate: ratio(matchedCalls.length, calls.length),
    outcomeDistribution: countBy(outcomes, calls, (call) => call.outcome),
    recentCalls: calls.slice(0, 8),
    recentOffers: offers.slice(0, 8),
    sentimentDistribution: countBy(sentiments, calls, (call) => call.sentiment),
    totalCalls: calls.length,
    transferMockedCount: calls.filter((call) => call.transferMocked).length,
    agreementRate: ratio(bookedCalls.length, calls.length),
  };
}

function average(values: ReadonlyArray<number>) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDailyConversion(calls: ReadonlyArray<CallRecord>) {
  const days = new Map<
    string,
    { date: string; calls: number; booked: number }
  >();

  for (const call of calls) {
    const date = call.createdAt.slice(0, 10);
    const current = days.get(date) ?? { date, calls: 0, booked: 0 };
    current.calls += 1;

    if (call.outcome === "booked") {
      current.booked += 1;
    }

    days.set(date, current);
  }

  return Array.from(days.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function countBy<const TKey extends string, TValue>(
  keys: ReadonlyArray<TKey>,
  values: ReadonlyArray<TValue>,
  selectKey: (value: TValue) => TKey,
) {
  return keys.map((key) => ({
    key,
    count: values.filter((value) => selectKey(value) === key).length,
  }));
}

function ratio(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return value / total;
}
