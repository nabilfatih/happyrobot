import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalServiceError } from "@/domain/errors";
import {
  evaluateOfferProgram,
  ingestCallProgram,
  runApi,
  searchLoadsProgram,
  verifyCarrierProgram,
} from "@/server/api";
import {
  evaluateOffer,
  ingestCall,
  searchLoads,
  verifyCarrier,
} from "@/server/backend";

vi.mock("@/server/backend", () => ({
  evaluateOffer: vi.fn(),
  ingestCall: vi.fn(),
  readDashboardReport: vi.fn(),
  searchLoads: vi.fn(),
  verifyCarrier: vi.fn(),
}));

const apiKey = "test-happyrobot-key";

describe("HappyRobot API handlers", () => {
  beforeEach(() => {
    process.env.HAPPYROBOT_API_KEY = apiKey;
    vi.clearAllMocks();
  });

  it("rejects requests without an API key", async () => {
    const response = await runApi(
      searchLoadsProgram(jsonRequest("/api/loads/search", {}, undefined)),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid payloads before calling Convex", async () => {
    const response = await runApi(
      evaluateOfferProgram(
        jsonRequest("/api/offers/evaluate", { loadId: "ACME-1001" }, apiKey),
      ),
    );

    expect(response.status).toBe(400);
    expect(evaluateOffer).not.toHaveBeenCalled();
  });

  it("proxies carrier verification to Convex", async () => {
    vi.mocked(verifyCarrier).mockReturnValue(
      Effect.succeed({
        cacheHit: true,
        carrier: {
          allowToOperate: "Y",
          checkedAt: "2026-05-22T10:00:00.000Z",
          eligible: true,
          legalName: "Road Ready LLC",
          mcNumber: "123456",
          outOfService: "N",
        },
        message: "Road Ready LLC is eligible with active operating authority.",
      }),
    );

    const response = await runApi(
      verifyCarrierProgram(
        jsonRequest("/api/carriers/verify", { mcNumber: "MC 123456" }, apiKey),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.carrier.eligible).toBe(true);
    expect(verifyCarrier).toHaveBeenCalledWith({ mcNumber: "MC 123456" });
  });

  it("returns a clean failure when Convex reports FMCSA unavailable", async () => {
    vi.mocked(verifyCarrier).mockReturnValue(
      Effect.fail(
        new ExternalServiceError({
          message: "FMCSA lookup returned an unsuccessful response.",
          status: 503,
        }),
      ),
    );

    const response = await runApi(
      verifyCarrierProgram(
        jsonRequest("/api/carriers/verify", { mcNumber: "MC 999998" }, apiKey),
      ),
    );

    expect(response.status).toBe(502);
  });

  it("stores final call ingestion records through Convex", async () => {
    vi.mocked(ingestCall).mockReturnValue(
      Effect.succeed({ callId: "call-id", stored: true }),
    );

    const response = await runApi(
      ingestCallProgram(
        jsonRequest(
          "/api/calls",
          {
            agreedRate: 2600,
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
          },
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(ingestCall).toHaveBeenCalledOnce();
  });

  it("returns offer evaluations from Convex", async () => {
    vi.mocked(evaluateOffer).mockReturnValue(
      Effect.succeed({
        counterRate: 2650,
        decision: "counter",
        eventId: "offer-id",
        maxRate: 2650,
        message: "Counter at $2,650 all-in.",
      }),
    );

    const response = await runApi(
      evaluateOfferProgram(
        jsonRequest(
          "/api/offers/evaluate",
          {
            loadId: "ACME-1001",
            mcNumber: "MC 123456",
            proposedRate: 2800,
            turn: 1,
          },
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(evaluateOffer).toHaveBeenCalledOnce();
  });

  it("returns load search results from Convex", async () => {
    vi.mocked(searchLoads).mockReturnValue(
      Effect.succeed({
        alternatives: [],
        matched: false,
        selected: null,
      }),
    );

    const response = await runApi(
      searchLoadsProgram(
        jsonRequest("/api/loads/search", { origin: "Dallas" }, apiKey),
      ),
    );

    expect(response.status).toBe(200);
    expect(searchLoads).toHaveBeenCalledWith({ origin: "Dallas" });
  });
});

function jsonRequest(url: string, body: unknown, key?: string) {
  const headers = new Headers({ "content-type": "application/json" });

  if (key) {
    headers.set("x-api-key", key);
  }

  return new Request(`http://localhost${url}`, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  });
}
