import { DatabaseSchema } from "@confect/server";
import { Calls, FmcsaCache, Loads, OfferEvents } from "./tables";

export default DatabaseSchema.make()
  .addTable(Loads)
  .addTable(FmcsaCache)
  .addTable(Calls)
  .addTable(OfferEvents);
