import { useMemo, useState } from "react";
import { Assistant } from "./components/Assistant";
import { FlameMark } from "./components/FlameMark";
import {
  flexModel,
  predict,
  type Atmosphere,
  type Ending,
  type Fuel,
} from "./model/flex";

const ENDING_COPY: Record<Ending, string> = {
  Extinction: "The visible flame went out.",
  Disruption: "The droplet broke apart before a clean ending.",
  Completion: "The burn ran through to the recorded completion.",
};

function atmosphereFromPreset(preset: (typeof flexModel.presets)[number]): Atmosphere {
  return { ...preset.input, fuel: preset.fuel as Fuel };
}

export default function App() {
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(
    atmosphereFromPreset(flexModel.presets[0]),
  );
  const prediction = useMemo(() => predict(atmosphere), [atmosphere]);
  const matched = flexModel.presets.find((preset) => sameAtmosphere(atmosphere, preset));
  const composition =
    atmosphere.oxygen + atmosphere.nitrogen + atmosphere.carbonMonoxide + atmosphere.helium;
  const importance = Object.entries(flexModel.importance).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#lab">
          <span className="brand-mark" aria-hidden="true" />
          LUMEN
        </a>
        <p className="team">DIU Smart X · Dhaka · Space Apps 2026</p>
      </header>

      <main>
        <section className="hero">
          <p className="kicker">Flame in Freefall · PSI-69</p>
          <h1>How an ISS droplet flame ends, learned from the FLEX table.</h1>
          <p className="lede">
            The model is a gradient-boosted classifier trained on the Flame
            Extinguishment Experiment table in NASA’s Physical Sciences Informatics
            repository, the combustion archive listed on data.nasa.gov. It reads the
            chamber atmosphere and predicts whether that burn ended in extinction,
            disruption, or completion.
          </p>
        </section>

        <section className="lab" id="lab">
          <form className="controls" onSubmit={(event) => event.preventDefault()}>
            <div className="controls-head">
              <h2>Chamber</h2>
              <p>{flexModel.rowsUsed} usable rows from the PSI-69 experimental table.</p>
            </div>

            <div className="presets" role="group" aria-label="Recorded FLEX tests">
              {flexModel.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={matched?.id === preset.id ? "preset selected" : "preset"}
                  onClick={() => setAtmosphere(atmosphereFromPreset(preset))}
                >
                  <strong>{preset.id}</strong>
                  <span>
                    {preset.fuel} · station recorded {preset.actual}
                  </span>
                </button>
              ))}
            </div>

            <fieldset className="choice">
              <legend>Fuel</legend>
              <div className="choice-row">
                {(["Methanol", "Heptane"] as Fuel[]).map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    aria-pressed={atmosphere.fuel === fuel}
                    onClick={() => setAtmosphere({ ...atmosphere, fuel })}
                  >
                    {fuel}
                  </button>
                ))}
              </div>
            </fieldset>

            <Slider
              label="Oxygen"
              value={atmosphere.oxygen}
              min={0.12}
              max={0.4}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(oxygen) => setAtmosphere({ ...atmosphere, oxygen })}
            />
            <Slider
              label="Nitrogen"
              value={atmosphere.nitrogen}
              min={0}
              max={0.9}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(nitrogen) => setAtmosphere({ ...atmosphere, nitrogen })}
            />
            <Slider
              label="CO column"
              value={atmosphere.carbonMonoxide}
              min={0}
              max={0.7}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(carbonMonoxide) => setAtmosphere({ ...atmosphere, carbonMonoxide })}
            />
            <Slider
              label="Helium"
              value={atmosphere.helium}
              min={0}
              max={0.45}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(helium) => setAtmosphere({ ...atmosphere, helium })}
            />
            <p className={Math.abs(composition - 1) > 0.05 ? "sum warn" : "sum"}>
              Mole fractions sum to {composition.toFixed(2)}. Rows in the table sum to about 1.
            </p>
            <Slider
              label="Pressure"
              value={atmosphere.pressureAtm}
              min={0.4}
              max={3.1}
              step={0.01}
              format={(value) => `${value.toFixed(2)} atm`}
              onChange={(pressureAtm) => setAtmosphere({ ...atmosphere, pressureAtm })}
            />
            <Slider
              label="Droplet"
              value={atmosphere.diameterMm}
              min={1.1}
              max={4.7}
              step={0.01}
              format={(value) => `${value.toFixed(2)} mm`}
              onChange={(diameterMm) => setAtmosphere({ ...atmosphere, diameterMm })}
            />
          </form>

          <section className="readout" aria-live="polite">
            <FlameMark atmosphere={atmosphere} prediction={prediction} />
            <p className={`risk risk-${prediction.top.toLowerCase()}`}>{prediction.top}</p>
            <h2>{ENDING_COPY[prediction.top]}</h2>
            {matched ? (
              <p className="match">
                PSI row {matched.id} actually ended in {matched.actual}.
              </p>
            ) : null}
            <ul className="probs">
              {flexModel.classes.map((name) => {
                const ending = name as Ending;
                const probability = prediction.probabilities[ending];
                return (
                  <li key={name}>
                    <span>
                      {name}
                      <b>{Math.round(probability * 100)}%</b>
                    </span>
                    <span className="bar">
                      <span style={{ width: `${probability * 100}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </section>

        <Assistant atmosphere={atmosphere} prediction={prediction} />

        <section className="notes">
          <h2>Held-out score</h2>
          <ul>
            <li>
              Five-fold accuracy is {percent(flexModel.metrics.accuracy)}. Always guessing{" "}
              {flexModel.metrics.majorityClass} scores {percent(flexModel.metrics.majorityAccuracy)}{" "}
              on these rows.
            </li>
            <li>
              Recall is {percent(flexModel.metrics.recall.Extinction)} for extinction,{" "}
              {percent(flexModel.metrics.recall.Disruption)} for disruption, and{" "}
              {percent(flexModel.metrics.recall.Completion)} for completion. Completion has only{" "}
              {flexModel.metrics.classCounts.Completion} rows.
            </li>
            <li>
              The PSI column used as a feature is named “CO initial ambient composition”. Values
              are mole fractions and sit beside nitrogen and helium in the atmosphere sum.
            </li>
          </ul>
        </section>

        <section className="sources">
          <h2>What the model uses</h2>
          <div className="source-grid">
            {importance.map(([name, value]) => (
              <article key={name}>
                <strong>{featureLabel(name)}</strong>
                <span>{value.toFixed(3)} accuracy drop when shuffled</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>
          Training file: PSI-69 experimental table ·{" "}
          <a
            href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-69"
            target="_blank"
            rel="noreferrer"
          >
            Flame Extinguishment Experiment
          </a>
          . The repository is the Physical Sciences Informatics record on data.nasa.gov.
        </p>
      </footer>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>
        {label}
        <b>{format(value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function sameAtmosphere(
  atmosphere: Atmosphere,
  preset: (typeof flexModel.presets)[number],
): boolean {
  return (
    atmosphere.fuel === preset.fuel &&
    Math.abs(atmosphere.oxygen - preset.input.oxygen) < 0.005 &&
    Math.abs(atmosphere.nitrogen - preset.input.nitrogen) < 0.005 &&
    Math.abs(atmosphere.carbonMonoxide - preset.input.carbonMonoxide) < 0.005 &&
    Math.abs(atmosphere.helium - preset.input.helium) < 0.005 &&
    Math.abs(atmosphere.pressureAtm - preset.input.pressureAtm) < 0.011 &&
    Math.abs(atmosphere.diameterMm - preset.input.diameterMm) < 0.011
  );
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function featureLabel(name: string): string {
  switch (name) {
    case "oxygen":
      return "Oxygen";
    case "nitrogen":
      return "Nitrogen";
    case "carbonMonoxide":
      return "CO column";
    case "helium":
      return "Helium";
    case "pressureAtm":
      return "Pressure";
    case "diameterMm":
      return "Droplet diameter";
    default:
      return "Fuel";
  }
}
