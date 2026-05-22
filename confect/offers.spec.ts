import { FunctionSpec, GroupSpec } from "@confect/core";
import { OfferEvaluateArgs, OfferEvaluateResponse } from "#/domain/schemas";
import { BackendError } from "#confect/errors";

export const offers = GroupSpec.make("offers").addFunction(
  FunctionSpec.publicMutation({
    name: "evaluate",
    args: OfferEvaluateArgs,
    returns: OfferEvaluateResponse,
    error: BackendError,
  }),
);
