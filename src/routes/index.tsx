import { createFileRoute } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  PhoneForwarded,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import type { DashboardReport } from "#/domain/schemas";
import { getDashboardData, guardDashboardRequest } from "#/server/dashboard";
import { api } from "#convex/_generated/api";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async ({ request, next }) =>
        (await guardDashboardRequest(request)) ?? next(),
    },
  },
  loader: () => getDashboardData(),
  component: Dashboard,
});

/** Renders either the authenticated dashboard or the Basic auth challenge page. */
function Dashboard() {
  const data = Route.useLoaderData();

  if (!data.authorized) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acme Logistics</CardTitle>
            <CardDescription>{data.message}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <RealtimeDashboard
      convexUrl={data.convexUrl}
      dashboardToken={data.dashboardToken}
      initialReport={data.report}
    />
  );
}

/** Creates the Convex realtime client for the authenticated dashboard session. */
function RealtimeDashboard({
  convexUrl,
  dashboardToken,
  initialReport,
}: {
  convexUrl: string;
  dashboardToken: string;
  initialReport: DashboardReport;
}) {
  const convexClient = useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl],
  );

  return (
    <ConvexProvider client={convexClient}>
      <DashboardSurface
        dashboardToken={dashboardToken}
        initialReport={initialReport}
      />
    </ConvexProvider>
  );
}

/** Renders the live operational dashboard from Convex report data. */
function DashboardSurface({
  dashboardToken,
  initialReport,
}: {
  dashboardToken: string;
  initialReport: DashboardReport;
}) {
  const liveReport = useQuery(api.dashboard.liveReport, { dashboardToken });
  const report = liveReport ?? initialReport;
  const maxOutcomeCount = maxCount(
    report.outcomeDistribution.map((entry) => entry.count),
  );
  const maxDailyCalls = maxCount(
    report.dailyConversion.map((entry) => entry.calls),
  );
  const metrics = [
    {
      label: "Total calls",
      value: report.totalCalls.toLocaleString(),
      detail: "Stored HappyRobot call records",
      icon: Activity,
    },
    {
      label: "Eligible rate",
      value: formatPercent(report.eligibleRate),
      detail: "Calls not blocked by carrier vetting",
      icon: BadgeCheck,
    },
    {
      label: "Agreement rate",
      value: formatPercent(report.agreementRate),
      detail: "Calls that reached a booked outcome",
      icon: CircleDollarSign,
    },
    {
      label: "Mock transfers",
      value: report.transferMockedCount.toLocaleString(),
      detail: "Successful transfer handoff messages",
      icon: PhoneForwarded,
    },
  ];

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-medium text-muted-foreground text-sm">
                Acme Logistics
              </p>
              <h1 className="mt-2 font-semibold text-3xl tracking-tight sm:text-4xl">
                Inbound carrier sales
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Live carrier-sales metrics backed by Acme-owned call and offer
                records.
              </p>
            </div>
            <Badge variant="success" size="lg">
              Operations live
            </Badge>
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="min-w-0 rounded-lg">
                <CardHeader className="gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardDescription>{metric.label}</CardDescription>
                    <metric.icon className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl">{metric.value}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {metric.detail}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0 rounded-lg">
          <CardHeader>
            <CardTitle>Outcome distribution</CardTitle>
            <CardDescription>
              Classification stored after each completed call.
            </CardDescription>
          </CardHeader>
          <CardPanel className="space-y-4">
            {report.outcomeDistribution.map((entry) => (
              <MetricBar
                key={entry.key}
                label={labelize(entry.key)}
                max={maxOutcomeCount}
                value={entry.count}
              />
            ))}
          </CardPanel>
        </Card>

        <Card className="min-w-0 rounded-lg">
          <CardHeader>
            <CardTitle>Daily conversion</CardTitle>
            <CardDescription>Calls and booked outcomes by day.</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="space-y-4">
              {report.dailyConversion.map((entry) => (
                <DailyConversionRow
                  key={entry.date}
                  booked={entry.booked}
                  calls={entry.calls}
                  date={entry.date}
                  maxCalls={maxDailyCalls}
                />
              ))}
            </div>
          </CardPanel>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 rounded-lg">
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>
              Latest carrier call extraction records.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.recentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{formatDate(call.createdAt)}</TableCell>
                    <TableCell>
                      {call.carrierName ?? `MC ${call.mcNumber}`}
                    </TableCell>
                    <TableCell>{call.loadId ?? "No match"}</TableCell>
                    <TableCell>
                      <Badge variant={outcomeVariant(call.outcome)}>
                        {labelize(call.outcome)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatMoney(call.agreedRate ?? call.loadboardRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>

        <aside className="min-w-0 space-y-5">
          <Card className="min-w-0 rounded-lg">
            <CardHeader>
              <CardTitle>Sales health</CardTitle>
              <CardDescription>
                Operational indicators for carrier-sales performance.
              </CardDescription>
            </CardHeader>
            <CardPanel className="space-y-4">
              <HealthRow
                label="Matched loads"
                value={formatPercent(report.matchedLoadRate)}
              />
              <HealthRow
                label="Avg agreed delta"
                value={formatMoney(report.averageAgreedDelta)}
              />
              <Separator />
              {report.sentimentDistribution.map((entry) => (
                <HealthRow
                  key={entry.key}
                  label={labelize(entry.key)}
                  value={entry.count}
                />
              ))}
            </CardPanel>
          </Card>

          <Card className="min-w-0 rounded-lg">
            <CardHeader>
              <CardTitle>Recent offers</CardTitle>
              <CardDescription>
                Negotiation decisions returned to the agent.
              </CardDescription>
            </CardHeader>
            <CardPanel className="space-y-3">
              {report.recentOffers.map((offer) => (
                <div key={offer.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-sm">{offer.loadId}</span>
                    <Badge
                      variant={
                        offer.decision === "accept" ? "success" : "outline"
                      }
                    >
                      {offer.decision}
                    </Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground text-sm">
                    MC {offer.mcNumber} offered{" "}
                    {formatMoney(offer.proposedRate)} on turn {offer.turn}.
                  </p>
                </div>
              ))}
            </CardPanel>
          </Card>
        </aside>
      </section>
    </main>
  );
}

/** Renders one proportional count bar for a dashboard distribution row. */
function MetricBar({
  label,
  max,
  value,
}: {
  label: string;
  max: number;
  value: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="font-medium text-sm">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: barWidth(value, max) }}
        />
      </div>
    </div>
  );
}

/** Renders daily calls and booked outcomes with shared scale bars. */
function DailyConversionRow({
  booked,
  calls,
  date,
  maxCalls,
}: {
  booked: number;
  calls: number;
  date: string;
  maxCalls: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm">{date}</span>
        <span className="font-medium text-sm">
          {booked.toLocaleString()} / {calls.toLocaleString()} booked
        </span>
      </div>
      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: barWidth(calls, maxCalls) }}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: barWidth(booked, maxCalls) }}
          />
        </div>
      </div>
    </div>
  );
}

/** Renders a compact label-value row inside the sales health card. */
function HealthRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

/** Returns a non-zero maximum so empty chart scales remain stable. */
function maxCount(values: ReadonlyArray<number>) {
  return Math.max(1, ...values);
}

/** Converts a metric value into a stable percentage width. */
function barWidth(value: number, max: number) {
  return `${Math.round((value / max) * 100)}%`;
}

/** Formats stored ISO timestamps for the operations dashboard. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

/** Formats optional dollar amounts without cents. */
function formatMoney(value?: number) {
  if (value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

/** Formats ratio metrics as whole percentages. */
function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}

/** Converts persisted enum values into readable dashboard labels. */
function labelize(value: string) {
  return value.replaceAll("_", " ");
}

/** Selects a badge treatment for a call outcome. */
function outcomeVariant(value: string) {
  if (value === "booked" || value === "transferred") {
    return "success";
  }

  if (value === "no_agreement" || value === "ineligible_carrier") {
    return "warning";
  }

  return "outline";
}
