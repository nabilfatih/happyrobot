import { FunctionSpec, GroupSpec } from "@confect/core";
import { LoadSearchArgs, LoadSearchResponse } from "#/domain/schemas";
import { BackendError } from "#confect/errors";

export const loads = GroupSpec.make("loads").addFunction(
  FunctionSpec.publicMutation({
    name: "search",
    args: LoadSearchArgs,
    returns: LoadSearchResponse,
    error: BackendError,
  }),
);
