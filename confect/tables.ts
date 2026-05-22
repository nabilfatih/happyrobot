import { Table } from "@confect/server";
import {
  CachedCarrier,
  Load,
  StoredCall,
  StoredOfferEvent,
} from "../src/domain/schemas";

export const Loads = Table.make("loads", Load).index("by_load_id", ["load_id"]);

export const FmcsaCache = Table.make("fmcsaCache", CachedCarrier).index(
  "by_mcNumber",
  ["mcNumber"],
);

export const Calls = Table.make("calls", StoredCall).index("by_createdAt", [
  "createdAt",
]);

export const OfferEvents = Table.make("offerEvents", StoredOfferEvent).index(
  "by_createdAt",
  ["createdAt"],
);
