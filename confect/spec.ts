import { Spec } from "@confect/core";
import { calls } from "./calls.spec";
import { carriers } from "./carriers.spec";
import { dashboard } from "./dashboard.spec";
import { loads } from "./loads.spec";
import { offers } from "./offers.spec";

export default Spec.make()
  .add(carriers)
  .add(loads)
  .add(offers)
  .add(calls)
  .add(dashboard);
