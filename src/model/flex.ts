import model from "./flexModel.json";

export type Fuel = "Methanol" | "Heptane";
export type Ending = "Completion" | "Disruption" | "Extinction";

export interface Atmosphere {
  oxygen: number;
  nitrogen: number;
  carbonMonoxide: number;
  helium: number;
  pressureAtm: number;
  diameterMm: number;
  fuel: Fuel;
}

type TreeNode = [number, number, number, number, number, number];

export interface Prediction {
  probabilities: Record<Ending, number>;
  top: Ending;
}

const classes = model.classes as Ending[];

function featureVector(input: Atmosphere): number[] {
  return [
    input.oxygen,
    input.nitrogen,
    input.carbonMonoxide,
    input.helium,
    input.pressureAtm,
    input.diameterMm,
    input.fuel === "Heptane" ? 1 : 0,
  ];
}

function leafValue(nodes: TreeNode[], features: number[]): number {
  let index = 0;
  while (nodes[index][5] === 0) {
    const [feature, threshold, left, right] = nodes[index];
    index = features[feature] <= threshold ? left : right;
  }
  return nodes[index][4];
}

export function predict(input: Atmosphere): Prediction {
  const features = featureVector(input);
  const scores = [...model.baseline];
  for (const iteration of model.trees) {
    iteration.forEach((nodes, classIndex) => {
      scores[classIndex] += leafValue(nodes as TreeNode[], features);
    });
  }
  const peak = Math.max(...scores);
  const weights = scores.map((score) => Math.exp(score - peak));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = Object.fromEntries(
    classes.map((name, index) => [name, weights[index] / total]),
  ) as Record<Ending, number>;
  const top = classes.reduce((best, name) =>
    probabilities[name] > probabilities[best] ? name : best,
  );
  return { probabilities, top };
}

export function predictFeatures(features: number[]): Prediction {
  const [
    oxygen,
    nitrogen,
    carbonMonoxide,
    helium,
    pressureAtm,
    diameterMm,
    fuelHeptane,
  ] = features;
  return predict({
    oxygen,
    nitrogen,
    carbonMonoxide,
    helium,
    pressureAtm,
    diameterMm,
    fuel: fuelHeptane >= 0.5 ? "Heptane" : "Methanol",
  });
}

export const flexModel = model;
