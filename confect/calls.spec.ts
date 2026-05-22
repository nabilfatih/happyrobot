import { FunctionSpec, GroupSpec } from "@confect/core";
import { CallIngestArgs, CallIngestResponse } from "#/domain/schemas";
import { BackendError } from "#confect/errors";

export const calls = GroupSpec.make("calls").addFunction(
  FunctionSpec.publicMutation({
    name: "ingest",
    args: CallIngestArgs,
    returns: CallIngestResponse,
    error: BackendError,
  }),
);
