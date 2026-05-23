import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalServiceError } from "#/domain/errors";
import {
  evaluateOfferProgram,
  ingestCallProgram,
  runApi,
  searchLoadsProgram,
  searchLoadsQueryProgram,
  verifyCarrierProgram,
  verifyCarrierQueryProgram,
} from "#/server/api";
import {
  evaluateOffer,
  ingestCall,
  searchLoads,
  verifyCarrier,
} from "#/server/backend";

vi.mock("#/server/backend", () => ({
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

  it("accepts comma-separated API keys for key rotation", async () => {
    process.env.HAPPYROBOT_API_KEY = `old-key,${apiKey}`;
    vi.mocked(searchLoads).mockReturnValue(
      Effect.succeed({
        alternatives: [],
        matched: false,
        selected: null,
      }),
    );

    const response = await runApi(
      searchLoadsProgram(jsonRequest("/api/loads/search", {}, apiKey)),
    );

    expect(response.status).toBe(200);
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

  it("maps query-style carrier verification webhooks to Convex", async () => {
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
      verifyCarrierQueryProgram(
        queryRequest("/api/carriers/verify?mc_number=MC%20123456", apiKey),
      ),
    );

    expect(response.status).toBe(200);
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

  it("normalizes the configured HappyRobot call webhook fields", async () => {
    vi.mocked(ingestCall).mockReturnValue(
      Effect.succeed({ callId: "call-id", stored: true }),
    );

    const response = await runApi(
      ingestCallProgram(
        jsonRequest(
          "/api/calls",
          {
            agreed_rate: "2600",
            booking_decision: "accepted",
            carrier_name: "Road Ready LLC",
            classification: "booked",
            decline_reason: "",
            loadboard_rate: "2450",
            mc_number: "MC 123456",
            negotiation_turns: "1",
            reference_number: "ACME-1001",
            sentiment: "positive",
            transcript: "Carrier accepted the Dallas to Atlanta load.",
            transfer_mocked: "true",
          },
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(ingestCall).toHaveBeenCalledWith({
      agreedRate: 2600,
      carrierName: "Road Ready LLC",
      loadId: "ACME-1001",
      loadboardRate: 2450,
      mcNumber: "MC 123456",
      negotiationTurns: 1,
      offers: [],
      outcome: "booked",
      sentiment: "positive",
      summary: "Carrier accepted the Dallas to Atlanta load.",
      transferMocked: true,
    });
  });

  it("normalizes HappyRobot call webhooks sent as JSON strings", async () => {
    vi.mocked(ingestCall).mockReturnValue(
      Effect.succeed({ callId: "call-id", stored: true }),
    );

    const response = await runApi(
      ingestCallProgram(
        jsonRequest(
          "/api/calls",
          JSON.stringify({
            booking_decision: "yes",
            classification: "no_agreement",
            decline_reason: "",
            mc_number: "42027",
            transcript: [
              { content: "Carrier countered at 2600.", role: "user" },
            ],
          }),
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(ingestCall).toHaveBeenCalledWith({
      agreedRate: undefined,
      carrierName: undefined,
      loadId: undefined,
      loadboardRate: undefined,
      mcNumber: "42027",
      negotiationTurns: 0,
      offers: [],
      outcome: "no_agreement",
      sentiment: "neutral",
      summary: "Carrier countered at 2600.",
      transferMocked: false,
    });
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

  it("normalizes the configured HappyRobot offer webhook fields", async () => {
    vi.mocked(evaluateOffer).mockReturnValue(
      Effect.succeed({
        acceptedRate: 2600,
        decision: "accept",
        eventId: "offer-id",
        maxRate: 2650,
        message: "Accepted at $2,600 all-in.",
      }),
    );

    const response = await runApi(
      evaluateOfferProgram(
        jsonRequest(
          "/api/offers/evaluate",
          {
            mc_number: "MC 123456",
            offer_amount: 2600,
            reference_number: "ACME-1001",
          },
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(evaluateOffer).toHaveBeenCalledWith({
      loadId: "ACME-1001",
      mcNumber: "MC 123456",
      proposedRate: 2600,
      turn: 1,
    });
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

  it("maps query-style load search webhooks to Convex", async () => {
    vi.mocked(searchLoads).mockReturnValue(
      Effect.succeed({
        alternatives: [],
        matched: false,
        selected: null,
      }),
    );

    const response = await runApi(
      searchLoadsQueryProgram(
        queryRequest(
          "/api/loads/search?origin=Dallas&equipment_type=van&max_weight=42000",
          apiKey,
        ),
      ),
    );

    expect(response.status).toBe(200);
    expect(searchLoads).toHaveBeenCalledWith({
      destination: undefined,
      equipmentType: "van",
      maxWeight: 42_000,
      origin: "Dallas",
      pickupDate: undefined,
    });
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

function queryRequest(url: string, key?: string) {
  const headers = new Headers();

  if (key) {
    headers.set("x-api-key", key);
  }

  return new Request(`http://localhost${url}`, {
    headers,
    method: "GET",
  });
}
