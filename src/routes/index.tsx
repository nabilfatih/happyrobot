import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  PhoneForwarded,
} from "lucide-react";
import {
  Bar,
  Grid as BarGrid,
  Tooltip as BarTooltip,
  XAxis as BarXAxis,
  YAxis as BarYAxis,
  EvilBarChart,
} from "@/components/evilcharts/charts/bar-chart";
import {
  EvilLineChart,
  Line,
  Grid as LineGrid,
  Tooltip as LineTooltip,
  XAxis as LineXAxis,
  YAxis as LineYAxis,
} from "@/components/evilcharts/charts/line-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData, guardDashboardRequest } from "@/server/dashboard";

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

const outcomeChartConfig = {
  count: {
    label: "Calls",
    colors: {
      light: [
        "var(--color-chart-1)",
        "var(--color-chart-2)",
        "var(--color-chart-3)",
        "var(--color-chart-4)",
        "var(--color-chart-5)",
      ],
    },
  },
} satisfies ChartConfig;

const conversionChartConfig = {
  calls: {
    label: "Calls",
    colors: { light: ["var(--color-chart-2)"] },
  },
  booked: {
    label: "Booked",
    colors: { light: ["var(--color-chart-1)"] },
  },
} satisfies ChartConfig;

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

  const report = data.report;
  const outcomeData = report.outcomeDistribution.map((entry) => ({
    label: labelize(entry.key),
    count: entry.count,
  }));
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
                Live metrics from the HappyRobot proof of concept, backed by the
                app-owned call and offer store.
              </p>
            </div>
            <Badge variant="success" size="lg">
              Production-ready demo
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="rounded-lg">
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

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Outcome distribution</CardTitle>
            <CardDescription>
              Classification stored after each completed call.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <EvilBarChart
              className="h-72"
              config={outcomeChartConfig}
              data={outcomeData}
              animationType="none"
            >
              <BarGrid vertical={false} />
              <BarXAxis dataKey="label" />
              <BarYAxis allowDecimals={false} />
              <BarTooltip />
              <Bar dataKey="count" variant="gradient" />
            </EvilBarChart>
          </CardPanel>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Daily conversion</CardTitle>
            <CardDescription>Calls and booked outcomes by day.</CardDescription>
          </CardHeader>
          <CardPanel>
            <EvilLineChart
              className="h-72"
              config={conversionChartConfig}
              data={[...report.dailyConversion]}
              animationType="none"
            >
              <LineGrid />
              <LineXAxis dataKey="date" />
              <LineYAxis allowDecimals={false} />
              <LineTooltip />
              <Line dataKey="calls" />
              <Line dataKey="booked" glowing />
            </EvilLineChart>
          </CardPanel>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 sm:px-8 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>
              Latest HappyRobot call extraction records.
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

        <aside className="space-y-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Sales health</CardTitle>
              <CardDescription>
                Operational indicators for the demo.
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

          <Card className="rounded-lg">
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

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

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function outcomeVariant(value: string) {
  if (value === "booked" || value === "transferred") {
    return "success";
  }

  if (value === "no_agreement" || value === "ineligible_carrier") {
    return "warning";
  }

  return "outline";
}
