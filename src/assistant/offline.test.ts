import { describe, expect, it } from "vitest";
import { flexModel, predict, type Atmosphere, type Fuel } from "../model/flex";
import { buildGrounding } from "./grounding";
import { answerOffline } from "./offline";

const preset = flexModel.presets[0]; // 20CAL08, Disruption
const chamber: Atmosphere = { ...preset.input, fuel: preset.fuel as Fuel };
const grounding = buildGrounding(chamber, predict(chamber));

describe("grounding", () => {
  it("carries the prediction, the nearest rows and real counterfactuals", () => {
    expect(grounding.prediction.top).toBe("Disruption");
    expect(grounding.neighbors[0].id).toBe(preset.id);
    expect(grounding.neighbors).toHaveLength(5);
    expect(grounding.outOfRange).toEqual([]);
    const oxygenDown = grounding.counterfactuals.find((c) => c.label === "oxygen −0.02");
    expect(oxygenDown?.change.oxygen).toBeCloseTo(0.19, 6);
    expect(oxygenDown?.top).toBe(predict({ ...chamber, oxygen: 0.19 }).top);
  });
});

describe("offline explainer", () => {
  it("explains the ending and cites recorded rows", () => {
    const { text, citations } = answerOffline("Why does the model predict this ending?", grounding);
    expect(text).toMatch(/predicts disruption \(74%\)/);
    expect(citations).toContain(preset.id);
    expect(text).toContain(preset.id);
  });

  it("lists the nearest experiments", () => {
    const { text, citations } = answerOffline("Which recorded experiments are closest?", grounding);
    expect(citations).toHaveLength(5);
    citations.forEach((id) => expect(text).toContain(id));
  });

  it("quotes the held-out score verbatim", () => {
    const { text } = answerOffline("How much should I trust this?", grounding);
    expect(text).toContain("75%");
    expect(text).toContain("69%");
    expect(text).toContain("27 rows");
  });

  it("answers oxygen questions with real model evaluations", () => {
    const { text } = answerOffline("What happens if oxygen drops by 2%?", grounding);
    expect(text).toContain("oxygen −0.02 → extinction");
    expect(text).toMatch(/decision boundary/);
  });

  it("warns when the chamber is outside the table", () => {
    const wild: Atmosphere = { ...chamber, oxygen: 0.6 };
    const g = buildGrounding(wild, predict(wild));
    const { text } = answerOffline("Is this inside the range you trained on?", g);
    expect(text).toMatch(/Caution: oxygen = 0.6/);
    expect(text).toMatch(/extrapolation/);
  });

  it("answers Banglish in Bangla", () => {
    const { text, citations } = answerOffline("Keno ei ending predict kortese?", grounding);
    expect(text).toMatch(/মডেল disruption বলেছে \(74%\)/);
    expect(citations).toContain(preset.id);
    expect(text).toContain(preset.id);
  });

  it("answers Bengali script in Bangla and keeps the oxygen counterfactual", () => {
    const { text } = answerOffline("অক্সিজেন কমালে কী হবে?", grounding);
    expect(text).toMatch(/অক্সিজেন/);
    expect(text).toContain("oxygen −0.02 → extinction");
  });
});
