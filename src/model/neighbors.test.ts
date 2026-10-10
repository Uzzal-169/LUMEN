import { describe, expect, it } from "vitest";
import { flexModel, type Atmosphere, type Fuel } from "./flex";
import { flexRows, nearest, outOfRange, trainingRange } from "./neighbors";

const preset = flexModel.presets[1];
const chamber: Atmosphere = { ...preset.input, fuel: preset.fuel as Fuel };

describe("nearest recorded burns", () => {
  it("loads the same rows the model was trained on", () => {
    expect(flexRows).toHaveLength(flexModel.rowsUsed);
    const counts = flexRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.ending] = (acc[row.ending] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual(flexModel.metrics.classCounts);
  });

  it("returns a recorded test as its own nearest neighbour", () => {
    const [first, ...rest] = nearest(chamber, 5);
    expect(first.row.id).toBe(preset.id);
    expect(first.distance).toBe(0);
    expect(first.row.ending).toBe(preset.actual);
    expect(rest).toHaveLength(4);
    rest.forEach((n, i) => {
      if (i > 0) expect(n.distance).toBeGreaterThanOrEqual(rest[i - 1].distance);
    });
  });

  it("prefers burns with the same fuel", () => {
    const sameFuel = nearest(chamber, 3);
    expect(sameFuel.every((n) => n.row.fuel === chamber.fuel)).toBe(true);
  });

  it("flags chambers outside the recorded range", () => {
    expect(outOfRange(chamber)).toEqual([]);
    expect(outOfRange({ ...chamber, oxygen: trainingRange.oxygen.max + 0.1 })).toEqual(["oxygen"]);
    expect(outOfRange({ ...chamber, pressureAtm: 0.1, diameterMm: 9 })).toEqual(["pressureAtm", "diameterMm"]);
  });
});
