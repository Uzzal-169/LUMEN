import { describe, expect, it } from "vitest";
import { flexModel, predictFeatures } from "./flex";

describe("FLEX model", () => {
  it("matches the exported check row", () => {
    const result = predictFeatures(flexModel.check.features);
    flexModel.classes.forEach((name, index) => {
      expect(result.probabilities[name as keyof typeof result.probabilities]).toBeCloseTo(
        flexModel.check.probabilities[index],
        3,
      );
    });
  });

  it("gives probabilities that sum to one", () => {
    const result = predictFeatures(flexModel.check.features);
    const total = Object.values(result.probabilities).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});
