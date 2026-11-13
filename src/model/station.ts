import { predict, type Atmosphere, type Ending } from "./flex";
import { nearest, outOfRange, trainingRange, type FlexRow } from "./neighbors";

export interface StationMove {
  feature: "oxygen" | "helium";
  value: number;
  top: Ending;
}

export interface StationHelp {
  nearest: FlexRow | null;
  alreadyExtinction: boolean;
  /** Lowest oxygen, with nitrogen adjusted, where the same model says extinction. */
  oxygen: StationMove | null;
  /** Highest helium the search reached that flips the model to extinction. */
  helium: StationMove | null;
}

const STEPS = 40;

/**
 * For a station droplet burn: the nearest recorded PSI-69 row, and the first
 * in-range oxygen drop or helium rise that makes this same model say extinction.
 * Nitrogen moves by the opposite amount so the mix still adds up. No new data.
 */
export function stationHelp(chamber: Atmosphere, locked: boolean): StationHelp {
  const nearestRow = nearest(chamber, 1)[0]?.row ?? null;
  if (locked) {
    return { nearest: nearestRow, alreadyExtinction: false, oxygen: null, helium: null };
  }
  const now = predict(chamber);
  if (now.top === "Extinction") {
    return { nearest: nearestRow, alreadyExtinction: true, oxygen: null, helium: null };
  }
  return {
    nearest: nearestRow,
    alreadyExtinction: false,
    oxygen: walk(chamber, "oxygen", -1),
    helium: walk(chamber, "helium", 1),
  };
}

function walk(chamber: Atmosphere, feature: "oxygen" | "helium", direction: -1 | 1): StationMove | null {
  const { min, max } = trainingRange[feature];
  let value = chamber[feature];
  for (let step = 0; step < STEPS; step += 1) {
    value = Number((value + direction * 0.01).toFixed(2));
    if (value < min - 1e-9 || value > max + 1e-9) return null;
    const next = shift(chamber, feature, value);
    if (!next) return null;
    const result = predict(next);
    if (result.top === "Extinction") return { feature, value, top: result.top };
  }
  return null;
}

function shift(chamber: Atmosphere, feature: "oxygen" | "helium", value: number): Atmosphere | null {
  const nitrogen = Number((chamber.nitrogen - (value - chamber[feature])).toFixed(4));
  if (nitrogen < trainingRange.nitrogen.min - 1e-9 || nitrogen > trainingRange.nitrogen.max + 1e-9) {
    return null;
  }
  const next = { ...chamber, [feature]: value, nitrogen };
  return outOfRange(next).length === 0 ? next : null;
}
