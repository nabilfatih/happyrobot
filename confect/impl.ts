import { Impl } from "@confect/server";
import { Layer } from "effect";
import api from "#confect/_generated/api";
import { calls } from "#confect/calls.impl";
import { carriers } from "#confect/carriers.impl";
import { dashboard } from "#confect/dashboard.impl";
import { loads } from "#confect/loads.impl";
import { offers } from "#confect/offers.impl";

export default Impl.make(api).pipe(
  Layer.provide(carriers),
  Layer.provide(loads),
  Layer.provide(offers),
  Layer.provide(calls),
  Layer.provide(dashboard),
  Impl.finalize,
);
