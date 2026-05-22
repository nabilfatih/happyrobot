import { Spec } from "@confect/core";
import { calls } from "#confect/calls.spec";
import { carriers } from "#confect/carriers.spec";
import { dashboard } from "#confect/dashboard.spec";
import { loads } from "#confect/loads.spec";
import { offers } from "#confect/offers.spec";

export default Spec.make()
  .add(carriers)
  .add(loads)
  .add(offers)
  .add(calls)
  .add(dashboard);
