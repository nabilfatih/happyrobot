import { Schema } from "effect";
import loadsJson from "../data/loads.json";
import { NotFoundError } from "./errors";
import { Load, type LoadSearchRequest, type Load as LoadType } from "./schemas";

const LoadList = Schema.Array(Load);

export const loads = Schema.decodeUnknownSync(LoadList)(loadsJson);

/** Finds a load by its stable load id. */
export function findLoad(loadId: string) {
  return findLoadIn(loads, loadId);
}

/** Finds a load by id in a caller-provided load collection. */
export function findLoadIn(records: ReadonlyArray<LoadType>, loadId: string) {
  return records.find((load) => load.load_id === loadId);
}

/** Returns a load or fails with a clear not-found error. */
export function requireLoad(loadId: string) {
  const load = findLoad(loadId);

  if (!load) {
    throw new NotFoundError({ message: `Load ${loadId} was not found.` });
  }

  return load;
}

/** Searches seeded loads with simple lane, equipment, pickup, and weight scoring. */
export function searchLoads(input: LoadSearchRequest) {
  return searchLoadRecords(loads, input);
}

/** Searches provided loads with simple lane, equipment, pickup, and weight scoring. */
export function searchLoadRecords(
  records: ReadonlyArray<LoadType>,
  input: LoadSearchRequest,
) {
  const rankedLoads = records
    .map((load) => ({ load, score: scoreLoad(load, input) }))
    .filter((entry) => entry.score > 0 || hasNoSearchConstraint(input))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.load);

  return {
    selected: rankedLoads[0],
    alternatives: rankedLoads.slice(1, 4),
  };
}

/** Formats load details for the HappyRobot voice agent response. */
export function summarizeLoad(load: LoadType) {
  return [
    `${load.load_id}: ${load.origin} to ${load.destination}`,
    `${load.equipment_type}, ${load.weight.toLocaleString()} lb`,
    `${load.miles.toLocaleString()} miles at $${load.loadboard_rate.toLocaleString()}`,
    `Pickup ${load.pickup_datetime}; delivery ${load.delivery_datetime}`,
  ].join(". ");
}

function scoreLoad(load: LoadType, input: LoadSearchRequest) {
  let score = 0;

  if (matchesText(load.origin, input.origin)) {
    score += 4;
  }

  if (matchesText(load.destination, input.destination)) {
    score += 4;
  }

  if (matchesText(load.equipment_type, input.equipmentType)) {
    score += 3;
  }

  if (matchesPickup(load.pickup_datetime, input.pickupDate)) {
    score += 2;
  }

  if (matchesWeight(load.weight, input.maxWeight)) {
    score += 1;
  }

  return score;
}

function hasNoSearchConstraint(input: LoadSearchRequest) {
  return !(
    input.origin ??
    input.destination ??
    input.equipmentType ??
    input.pickupDate ??
    input.maxWeight
  );
}

function matchesPickup(pickupDatetime: string, pickupDate?: string) {
  if (!pickupDate) {
    return false;
  }

  return pickupDatetime.startsWith(pickupDate);
}

function matchesText(value: string, search?: string) {
  if (!search) {
    return false;
  }

  return value.toLowerCase().includes(search.toLowerCase());
}

function matchesWeight(weight: number, maxWeight?: number) {
  if (!maxWeight) {
    return false;
  }

  return weight <= maxWeight;
}
