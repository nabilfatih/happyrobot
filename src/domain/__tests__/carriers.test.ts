import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCarrierFromFmcsa,
  mapFmcsaCarrier,
  normalizeMcNumber,
} from "../carriers";

describe("carrier verification helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("maps the live QCMobile docket response field names", () => {
    const carrier = mapFmcsaCarrier("42027", {
      allowedToOperate: "Y",
      legalName: "AFB CO",
      oosDate: null,
    });

    expect(carrier).toMatchObject({
      allowToOperate: "Y",
      eligible: true,
      legalName: "AFB CO",
      outOfService: "N",
    });
  });

  it("decodes FMCSA carrier responses wrapped inside carrier objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            content: [
              {
                carrier: {
                  allowedToOperate: "Y",
                  legalName: "Wrapped Carrier LLC",
                  oosDate: null,
                },
              },
            ],
          }),
        ),
      ),
    );

    const carrier = await Effect.runPromise(
      fetchCarrierFromFmcsa("42027", "test-key"),
    );

    expect(carrier).toMatchObject({
      eligible: true,
      legalName: "Wrapped Carrier LLC",
      mcNumber: "42027",
    });
  });
});
