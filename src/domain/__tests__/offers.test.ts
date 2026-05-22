import { describe, expect, it } from "vitest";
import { evaluateOffer, roundTo25 } from "../offers";

describe("offer negotiation policy", () => {
  it("rounds to broker-friendly increments", () => {
    expect(roundTo25(2646)).toBe(2650);
  });

  it("accepts offers inside the 8 percent ceiling", () => {
    const result = evaluateOffer("ACME-1001", 2600, 1);

    expect(result.decision).toBe("accept");
  });

  it("counters high offers before the third negotiation turn", () => {
    const result = evaluateOffer("ACME-1001", 2800, 1);

    expect(result.decision).toBe("counter");
    expect(result.counterRate).toBe(2650);
  });

  it("rejects after the third negotiation turn", () => {
    const result = evaluateOffer("ACME-1001", 2800, 3);

    expect(result.decision).toBe("reject");
  });
});
