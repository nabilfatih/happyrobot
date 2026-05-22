import { describe, expect, it } from "vitest";
import { buildDashboardReport } from "#/domain/metrics";

describe("dashboard metrics", () => {
  it("aggregates call, conversion, sentiment, and offer metrics", () => {
    const report = buildDashboardReport(
      [
        {
          agreedRate: 2600,
          carrierName: "Road Ready LLC",
          createdAt: "2026-05-22T10:00:00.000Z",
          id: "call-1",
          loadId: "ACME-1001",
          loadboardRate: 2450,
          mcNumber: "123456",
          negotiationTurns: 1,
          offers: [{ rate: 2600, turn: 1 }],
          outcome: "booked",
          sentiment: "positive",
          summary: "Carrier accepted the load.",
          transferMocked: true,
        },
        {
          createdAt: "2026-05-22T11:00:00.000Z",
          id: "call-2",
          mcNumber: "654321",
          negotiationTurns: 0,
          offers: [],
          outcome: "ineligible_carrier",
          sentiment: "neutral",
          summary: "Carrier was not eligible.",
          transferMocked: false,
        },
      ],
      [
        {
          createdAt: "2026-05-22T10:05:00.000Z",
          decision: "accept",
          id: "offer-1",
          loadId: "ACME-1001",
          mcNumber: "123456",
          proposedRate: 2600,
          turn: 1,
        },
      ],
    );

    expect(report.totalCalls).toBe(2);
    expect(report.eligibleRate).toBe(0.5);
    expect(report.matchedLoadRate).toBe(0.5);
    expect(report.agreementRate).toBe(0.5);
    expect(report.averageAgreedDelta).toBe(150);
    expect(report.transferMockedCount).toBe(1);
    expect(report.dailyConversion[0]).toMatchObject({ booked: 1, calls: 2 });
    expect(report.recentOffers[0]?.decision).toBe("accept");
  });
});
