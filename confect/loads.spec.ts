import { FunctionSpec, GroupSpec } from "@confect/core";
import { LoadSearchArgs, LoadSearchResponse } from "../src/domain/schemas";
import { BackendError } from "./errors";

export const loads = GroupSpec.make("loads").addFunction(
  FunctionSpec.publicMutation({
    name: "search",
    args: LoadSearchArgs,
    returns: LoadSearchResponse,
    error: BackendError,
  }),
);
