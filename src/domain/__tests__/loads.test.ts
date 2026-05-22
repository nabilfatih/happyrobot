import { describe, expect, it } from "vitest";
import { searchLoads } from "#/domain/loads";

describe("load search", () => {
  it("prioritizes lane and equipment matches", () => {
    const result = searchLoads({
      destination: "Atlanta",
      equipmentType: "Dry Van",
      origin: "Dallas",
    });

    expect(result.selected?.load_id).toBe("ACME-1001");
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("returns no selected load for impossible constraints", () => {
    const result = searchLoads({
      destination: "Seattle",
      equipmentType: "Conestoga",
      origin: "Miami",
    });

    expect(result.selected).toBeUndefined();
  });
});
