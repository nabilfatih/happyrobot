import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";
import {
  CachedCarrier,
  VerifyCarrierArgs,
  VerifyCarrierResponse,
} from "../src/domain/schemas";
import { BackendError } from "./errors";

export const carriers = GroupSpec.make("carriers")
  .addFunction(
    FunctionSpec.publicAction({
      name: "verify",
      args: VerifyCarrierArgs,
      returns: VerifyCarrierResponse,
      error: BackendError,
    }),
  )
  .addFunction(
    FunctionSpec.internalQuery({
      name: "cacheByMc",
      args: Schema.Struct({ mcNumber: Schema.String }),
      returns: Schema.NullOr(CachedCarrier),
    }),
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "saveCache",
      args: CachedCarrier,
      returns: CachedCarrier,
    }),
  );
