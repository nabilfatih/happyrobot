import { Impl } from "@confect/server";
import { Layer } from "effect";
import api from "./_generated/api";
import { calls } from "./calls.impl";
import { carriers } from "./carriers.impl";
import { dashboard } from "./dashboard.impl";
import { loads } from "./loads.impl";
import { offers } from "./offers.impl";

export default Impl.make(api).pipe(
  Layer.provide(carriers),
  Layer.provide(loads),
  Layer.provide(offers),
  Layer.provide(calls),
  Layer.provide(dashboard),
  Impl.finalize,
);
