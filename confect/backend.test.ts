import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import refs from "#confect/_generated/refs";
import * as TestConfect from "#confect/TestConfect";

const backendKey = "convex-test-key";
const dashboardToken = "dashboard-test-token";

describe("Confect backend", () => {
  beforeEach(() => {
    process.env.CONVEX_BACKEND_KEY = backendKey;
    process.env.DASHBOARD_REALTIME_TOKEN = dashboardToken;
    process.env.FMCSA_WEB_KEY = "fmcsa-test-key";
    vi.unstubAllGlobals();
  });

  it("seeds loads and searches the best match", async () => {
    await Effect.gen(function* () {
      const convex = yield* TestConfect.TestConfect;
      const result = yield* convex.mutation(refs.public.loads.search, {
        backendKey,
        destination: "Atlanta",
        equipmentType: "Dry Van",
        origin: "Dallas",
      });

      expect(result.selected?.load_id).toBe("ACME-1001");
      expect(result.alternatives.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(TestConfect.layer()), Effect.runPromise);
  });

  it("stores offer events and call records for dashboard metrics", async () => {
    await Effect.gen(function* () {
      const convex = yield* TestConfect.TestConfect;

      yield* convex.mutation(refs.public.loads.search, {
        backendKey,
        origin: "Dallas",
      });

      const offer = yield* convex.mutation(refs.public.offers.evaluate, {
        backendKey,
        loadId: "ACME-1001",
        mcNumber: "MC 123456",
        proposedRate: 2800,
        turn: 1,
      });

      yield* convex.mutation(refs.public.calls.ingest, {
        agreedRate: 2600,
        backendKey,
        carrierName: "Road Ready LLC",
        loadId: "ACME-1001",
        loadboardRate: 2450,
        mcNumber: "123456",
        negotiationTurns: 1,
        offers: [{ rate: 2600, turn: 1 }],
        outcome: "booked",
        sentiment: "positive",
        summary: "Carrier accepted the Dallas to Atlanta load.",
        transferMocked: true,
      });

      const report = yield* convex.query(refs.public.dashboard.report, {
        backendKey,
      });
      const liveReport = yield* convex.query(refs.public.dashboard.liveReport, {
        dashboardToken,
      });

      expect(offer.decision).toBe("counter");
      expect(report.totalCalls).toBe(1);
      expect(liveReport.totalCalls).toBe(1);
      expect(report.recentOffers[0]?.decision).toBe("counter");
      expect(report.agreementRate).toBe(1);
    }).pipe(Effect.provide(TestConfect.layer()), Effect.runPromise);
  });

  it("caches FMCSA carrier verification results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            content: {
              allowToOperate: "Y",
              legalName: "Road Ready LLC",
              outOfService: "N",
            },
          }),
        ),
      ),
    );

    await Effect.gen(function* () {
      const convex = yield* TestConfect.TestConfect;
      const first = yield* convex.action(refs.public.carriers.verify, {
        backendKey,
        mcNumber: "MC 123456",
      });
      const second = yield* convex.action(refs.public.carriers.verify, {
        backendKey,
        mcNumber: "MC 123456",
      });

      expect(first.cacheHit).toBe(false);
      expect(second.cacheHit).toBe(true);
      expect(second.carrier.eligible).toBe(true);
    }).pipe(Effect.provide(TestConfect.layer()), Effect.runPromise);
  });
});
