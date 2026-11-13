import { describe, expect, it } from "vitest";
import { flexModel, predict, type Atmosphere } from "./flex";
import { stationHelp } from "./station";

const chamber: Atmosphere = {
  ...flexModel.presets[0].input,
  fuel: "Methanol",
};

describe("station next burn", () => {
  it("names a real PSI-69 row and does not invent a step when the score is locked", () => {
    const help = stationHelp(chamber, true);
    expect(help.nearest?.id).toBeTruthy();
    expect(help.oxygen).toBeNull();
    expect(help.helium).toBeNull();
  });

  it("only reports an oxygen step when that chamber really predicts extinction", () => {
    const help = stationHelp(chamber, false);
    if (predict(chamber).top === "Extinction") {
      expect(help.alreadyExtinction).toBe(true);
      return;
    }
    if (!help.oxygen) return;
    const next = {
      ...chamber,
      oxygen: help.oxygen.value,
      nitrogen: chamber.nitrogen - (help.oxygen.value - chamber.oxygen),
    };
    expect(predict(next).top).toBe("Extinction");
  });
});
