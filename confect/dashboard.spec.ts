import { FunctionSpec, GroupSpec } from "@confect/core";
import {
  DashboardLiveReportArgs,
  DashboardReport,
  DashboardReportArgs,
} from "../src/domain/schemas";
import { BackendError } from "./errors";

export const dashboard = GroupSpec.make("dashboard")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "report",
      args: DashboardReportArgs,
      returns: DashboardReport,
      error: BackendError,
    }),
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "liveReport",
      args: DashboardLiveReportArgs,
      returns: DashboardReport,
      error: BackendError,
    }),
  );
