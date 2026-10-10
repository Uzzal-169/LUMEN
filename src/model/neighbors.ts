import rowsFile from "./flexRows.json";
import type { Atmosphere, Ending, Fuel } from "./flex";

export interface FlexRow {
  id: string;
  testNumber: string;
  date: string;
  fuel: Fuel;
  oxygen: number;
  nitrogen: number;
  carbonMonoxide: number;
  helium: number;
  pressureAtm: number;
  diameterMm: number;
  ending: Ending;
  extinctionDiameterMm: number | null;
  burningRateMm2s: number | null;
  burnTimeS: number | null;
}

export interface Neighbor {
  row: FlexRow;
  /** Range-normalised distance; 0 means the chamber matches the recorded test exactly. */
  distance: number;
}

export type NumericFeature = "oxygen" | "nitrogen" | "carbonMonoxide" | "helium" | "pressureAtm" | "diameterMm";

export const NUMERIC_FEATURES: NumericFeature[] = [
  "oxygen",
  "nitrogen",
  "carbonMonoxide",
  "helium",
  "pressureAtm",
  "diameterMm",
];

export const flexRows = rowsFile.rows as FlexRow[];

export interface FeatureRange {
  min: number;
  max: number;
}

export const trainingRange: Record<NumericFeature, FeatureRange> = Object.fromEntries(
  NUMERIC_FEATURES.map((name) => {
    const values = flexRows.map((row) => row[name]);
    return [name, { min: Math.min(...values), max: Math.max(...values) }];
  }),
) as Record<NumericFeature, FeatureRange>;

/** Features of the requested chamber that fall outside what the table ever recorded. */
export function outOfRange(input: Atmosphere): NumericFeature[] {
  return NUMERIC_FEATURES.filter((name) => {
    const { min, max } = trainingRange[name];
    return input[name] < min - 1e-9 || input[name] > max + 1e-9;
  });
}

const FUEL_PENALTY = 1;

export function distance(input: Atmosphere, row: FlexRow): number {
  let sum = 0;
  for (const name of NUMERIC_FEATURES) {
    const { min, max } = trainingRange[name];
    const span = max - min || 1;
    const delta = (input[name] - row[name]) / span;
    sum += delta * delta;
  }
  if (input.fuel !== row.fuel) sum += FUEL_PENALTY;
  return Math.sqrt(sum);
}

/** The k recorded burns closest to the requested chamber, nearest first. */
export function nearest(input: Atmosphere, k = 5): Neighbor[] {
  return flexRows
    .map((row) => ({ row, distance: distance(input, row) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}

/** How the recorded burns among the neighbours actually ended. */
export function endingCounts(neighbors: Neighbor[]): Record<Ending, number> {
  const counts: Record<Ending, number> = { Completion: 0, Disruption: 0, Extinction: 0 };
  for (const { row } of neighbors) counts[row.ending] += 1;
  return counts;
}
