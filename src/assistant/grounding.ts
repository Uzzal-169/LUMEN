import { flexModel, predict, type Atmosphere, type Ending, type Prediction } from "../model/flex";
import { endingCounts, nearest, outOfRange, trainingRange, type Neighbor, type NumericFeature } from "../model/neighbors";

/**
 * Everything the assistant is allowed to talk about. Built deterministically in the
 * browser from the model and the PSI-69 table; sent verbatim to the language model
 * (when one is configured) and used by the offline explainer otherwise.
 */
export interface Grounding {
  dataset: {
    accession: string;
    title: string;
    rowsUsed: number;
    catalog: string;
  };
  chamber: Atmosphere;
  prediction: {
    top: Ending;
    probabilities: Record<Ending, number>;
  };
  neighbors: Array<{
    id: string;
    fuel: string;
    oxygen: number;
    nitrogen: number;
    carbonMonoxide: number;
    helium: number;
    pressureAtm: number;
    diameterMm: number;
    ending: Ending;
    burnTimeS: number | null;
    distance: number;
  }>;
  neighborEndings: Record<Ending, number>;
  outOfRange: Array<{ feature: NumericFeature; value: number; min: number; max: number }>;
  counterfactuals: Counterfactual[];
  metrics: {
    accuracy: number;
    majorityClass: string;
    majorityAccuracy: number;
    recall: Record<string, number>;
    classCounts: Record<string, number>;
  };
  importance: Array<{ feature: string; accuracyDrop: number }>;
}

export interface Counterfactual {
  label: string;
  change: Partial<Atmosphere>;
  top: Ending;
  probabilities: Record<Ending, number>;
}

export const NEIGHBOR_COUNT = 5;

export function buildGrounding(chamber: Atmosphere, prediction: Prediction): Grounding {
  const neighbors = nearest(chamber, NEIGHBOR_COUNT);
  return {
    dataset: {
      accession: flexModel.accession,
      title: flexModel.title,
      rowsUsed: flexModel.rowsUsed,
      catalog: "Physical Sciences Informatics repository, listed on data.nasa.gov",
    },
    chamber,
    prediction: { top: prediction.top, probabilities: prediction.probabilities },
    neighbors: neighbors.map(describeNeighbor),
    neighborEndings: endingCounts(neighbors),
    outOfRange: outOfRange(chamber).map((feature) => ({
      feature,
      value: chamber[feature],
      min: trainingRange[feature].min,
      max: trainingRange[feature].max,
    })),
    counterfactuals: counterfactuals(chamber),
    metrics: flexModel.metrics,
    importance: Object.entries(flexModel.importance)
      .map(([feature, accuracyDrop]) => ({ feature, accuracyDrop }))
      .sort((a, b) => b.accuracyDrop - a.accuracyDrop),
  };
}

function describeNeighbor({ row, distance }: Neighbor): Grounding["neighbors"][number] {
  return {
    id: row.id,
    fuel: row.fuel,
    oxygen: row.oxygen,
    nitrogen: row.nitrogen,
    carbonMonoxide: row.carbonMonoxide,
    helium: row.helium,
    pressureAtm: row.pressureAtm,
    diameterMm: row.diameterMm,
    ending: row.ending,
    burnTimeS: row.burnTimeS,
    distance: Number(distance.toFixed(3)),
  };
}

/**
 * Real model evaluations at nearby chambers. These are the only "what if" numbers the
 * assistant may quote, so a language model never has to invent a probability.
 */
export function counterfactuals(chamber: Atmosphere): Counterfactual[] {
  const variants: Array<{ label: string; change: Partial<Atmosphere> }> = [
    { label: "oxygen −0.02", change: { oxygen: round(chamber.oxygen - 0.02) } },
    { label: "oxygen +0.02", change: { oxygen: round(chamber.oxygen + 0.02) } },
    { label: "pressure −0.3 atm", change: { pressureAtm: round(chamber.pressureAtm - 0.3) } },
    { label: "pressure +0.3 atm", change: { pressureAtm: round(chamber.pressureAtm + 0.3) } },
    { label: "droplet −0.5 mm", change: { diameterMm: round(chamber.diameterMm - 0.5) } },
    { label: "droplet +0.5 mm", change: { diameterMm: round(chamber.diameterMm + 0.5) } },
    {
      label: chamber.fuel === "Methanol" ? "fuel → Heptane" : "fuel → Methanol",
      change: { fuel: chamber.fuel === "Methanol" ? "Heptane" : "Methanol" },
    },
  ];
  return variants
    .filter(({ change }) => Object.values(change).every((value) => typeof value !== "number" || value > 0))
    .map(({ label, change }) => {
      const result = predict({ ...chamber, ...change });
      return { label, change, top: result.top, probabilities: result.probabilities };
    });
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
