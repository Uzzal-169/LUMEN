import { describe, expect, it } from "vitest";
import { contextBlocks, demoSmokeFlag, matchMaterials, psiToAtm } from "./tools";

describe("tool bench", () => {
  it("converts the briefing pressures into atmospheres", () => {
    expect(psiToAtm(14.7)).toBeCloseTo(1, 2);
    expect(psiToAtm(10.2)).toBeCloseTo(0.694, 3);
    expect(psiToAtm(4.3)).toBeCloseTo(0.293, 2);
  });

  it("scores only microgravity", () => {
    const base = { gravity: "microgravity" as const, temperatureC: 25, airSpeedCmS: 1, sensor: "MDCA" };
    expect(contextBlocks(base)).toEqual([]);
    expect(contextBlocks({ ...base, gravity: "lunar" })[0]).toMatch(/not scored/);
  });

  it("finds real BASS materials and does not invent an ignition time", () => {
    const hits = matchMaterials("SIBAL");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.id.startsWith("BASS"))).toBe(true);
    expect(hits[0]?.detail).toMatch(/No ignition time/);
  });

  it("flags only the demo smoke rule", () => {
    expect(demoSmokeFlag(0.12, 0.2)).toMatch(/quiet/);
    expect(demoSmokeFlag(0.35, 0.2)).toMatch(/fired/);
  });
});
