import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mapFmcsaCarrier } from "@/domain/carriers";
import {
  evaluateOfferProgram,
  ingestCallProgram,
  runApi,
  searchLoadsProgram,
  verifyCarrierProgram,
} from "@/server/api";
import {
  closeDatabase,
  readRecentCalls,
  readRecentOfferEvents,
  saveCachedCarrier,
} from "@/server/database";

const apiKey = "test-happyrobot-key";

describe("HappyRobot API handlers", () => {
  beforeAll(() => {
    process.env.DATABASE_PATH = join(
      mkdtempSync(join(tmpdir(), "fde-")),
      "test.sqlite",
    );
    process.env.HAPPYROBOT_API_KEY = apiKey;
    process.env.FMCSA_WEB_KEY = "unused-in-cache-hit-test";
  });

  afterAll(() => {
    closeDatabase();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects requests without an API key", async () => {
    const response = await runApi(
      searchLoadsProgram(jsonRequest("/api/loads/search", {}, undefined)),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid payloads", async () => {
    const response = await runApi(
      evaluateOfferProgram(
        jsonRequest("/api/offers/evaluate", { loadId: "ACME-1001" }, apiKey),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns cached carrier verification without calling FMCSA", async () => {
    const carrier = mapFmcsaCarrier("123456", {
      allowToOperate: "Y",
      legalName: "Road Ready LLC",
      outOfService: "N",
    });

    saveCachedCarrier(carrier);

    const response = await runApi(
      verifyCarrierProgram(
        jsonRequest("/api/carriers/verify", { mcNumber: "MC 123456" }, apiKey),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cacheHit).toBe(true);
    expect(body.carrier.eligible).toBe(true);
  });

  it("returns a clean failure when FMCSA is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("Service unavailable", { status: 503 })),
      ),
    );

    const response = await runApi(
      verifyCarrierProgram(
        jsonRequest("/api/carriers/verify", { mcNumber: "MC 999998" }, apiKey),
      ),
    );

    expect(response.status).toBe(502);
  });

  it("stores final call ingestion records", async () => {
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
    expect(readRecentCalls()[0]?.outcome).toBe("booked");
  });

  it("stores offer events from negotiation evaluation", async () => {
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
    expect(readRecentOfferEvents()[0]?.decision).toBe("counter");
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
