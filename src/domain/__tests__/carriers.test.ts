import { describe, expect, it } from "vitest";
import { mapFmcsaCarrier, normalizeMcNumber } from "../carriers";

describe("carrier verification helpers", () => {
  it("normalizes spoken MC numbers to digits", () => {
    expect(normalizeMcNumber("MC 123-456")).toBe("123456");
  });

  it("marks carriers eligible only when allowed and not out of service", () => {
    const carrier = mapFmcsaCarrier("123456", {
      allowToOperate: "Y",
      dotNumber: 7654321,
      legalName: "Acme Carrier LLC",
      outOfService: "N",
    });

    expect(carrier).toMatchObject({
      eligible: true,
      legalName: "Acme Carrier LLC",
      mcNumber: "123456",
    });
  });

  it("blocks out-of-service carriers", () => {
    const carrier = mapFmcsaCarrier("123456", {
      allowToOperate: "Y",
      outOfService: "Y",
    });

    expect(carrier.eligible).toBe(false);
  });
});
