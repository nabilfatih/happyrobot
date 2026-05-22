import { FunctionSpec, GroupSpec } from "@confect/core";
import { CallIngestArgs, CallIngestResponse } from "../src/domain/schemas";
import { BackendError } from "./errors";

export const calls = GroupSpec.make("calls").addFunction(
  FunctionSpec.publicMutation({
    name: "ingest",
    args: CallIngestArgs,
    returns: CallIngestResponse,
    error: BackendError,
  }),
);
