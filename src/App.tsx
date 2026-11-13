import { useMemo, useState } from "react";
import { Assistant } from "./components/Assistant";
import { ChallengeBrief } from "./components/ChallengeBrief";
import { FlameMark } from "./components/FlameMark";
import {
  flexModel,
  predict,
  type Atmosphere,
  type Ending,
  type Fuel,
} from "./model/flex";
import { nearest, outOfRange, trainingRange, type NumericFeature } from "./model/neighbors";
import { FLEX_REPORT_PAGE, REPORTS } from "./model/reports";
import { StationPanel } from "./components/StationPanel";
import { ToolBench } from "./components/ToolBench";
import {
  ATMOSPHERE_PRESETS,
  PLACE_USES,
  contextBlocks,
  psiToAtm,
  type AtmospherePreset,
  type BenchContext,
  type PlaceUse,
} from "./model/tools";

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
  const outside = useMemo(() => outOfRange(atmosphere), [atmosphere]);
  const neighbors = useMemo(() => nearest(atmosphere, 5), [atmosphere]);
  const [placeId, setPlaceId] = useState<PlaceUse>("station");
  const [context, setContext] = useState<BenchContext>({
    gravity: "microgravity",
    temperatureC: 25,
    airSpeedCmS: 1,
    sensor: "MDCA",
  });
  const gates = useMemo(() => contextBlocks(context), [context]);
  const locked = outside.length > 0 || gates.length > 0;
  const matched = flexModel.presets.find((preset) => sameAtmosphere(atmosphere, preset));
  const composition =
    atmosphere.oxygen + atmosphere.nitrogen + atmosphere.carbonMonoxide + atmosphere.helium;
  const importance = Object.entries(flexModel.importance).sort((a, b) => b[1] - a[1]);

  return (
    <div className="console">
      <header className="topbar">
        <a className="brand" href="#lab">
          <span className="brand-mark" aria-hidden="true" />
          LUMEN
        </a>
        <nav className="nav" aria-label="Sections">
          <a className="nav-pill" href="#lab">Chamber</a>
          <a href="#burns">Burns</a>
          <a href="#ask">Ask</a>
          <a href="#brief">Brief</a>
          <a href="#tools">Tools</a>
          <a href="#reports">Reports</a>
        </nav>
        <p className="status">
          <span className="status-dot" aria-hidden="true" />
          PSI-69 · local model
        </p>
      </header>

      <div className="place-bar">
        <nav className="nav" aria-label="Habitable place">
          {PLACE_USES.map((place) => (
            <button
              key={place.id}
              type="button"
              className={place.id === placeId ? "nav-pill" : ""}
              aria-pressed={place.id === placeId}
              onClick={() => selectPlace(place.id, setPlaceId, setAtmosphere, setContext)}
            >
              {place.label}
            </button>
          ))}
        </nav>
        <p className="place-job">{PLACE_USES.find((place) => place.id === placeId)?.job}</p>
      </div>

      <main>
        <section className="stage" id="lab">
          <div className="viewport">
            <div className="viewport-copy">
              <p className="kicker">Flame in Freefall · SI dashboard</p>
              <h1>How an ISS droplet flame ends.</h1>
              <p className="lede">
                Summarizes and ranks PSI-69 burns, then predicts extinction, disruption, or completion. The other
                investigations in the 2026 statement are listed beside this score and are not in the fit.
              </p>
            </div>
            <div className="viewport-flame">
              <FlameMark atmosphere={atmosphere} prediction={prediction} locked={locked} />
            </div>
            <ul className="telemetry">
              <li>
                <span>Oxygen</span>
                <strong>{atmosphere.oxygen.toFixed(2)}</strong>
              </li>
              <li>
                <span>Pressure</span>
                <strong>{atmosphere.pressureAtm.toFixed(2)} atm</strong>
              </li>
              <li>
                <span>Droplet</span>
                <strong>{atmosphere.diameterMm.toFixed(2)} mm</strong>
              </li>
              <li>
                <span>Fuel</span>
                <strong>{atmosphere.fuel}</strong>
              </li>
            </ul>
            <p className="limit">Screens the air before flight. It does not detect or extinguish a cabin fire.</p>
          </div>

          <aside className="side">
          <section className="readout" aria-live="polite">
            <p className="card-kicker">Prediction</p>
            {locked ? (
              <>
                <p className="risk risk-locked">Outside the recorded range</p>
                <h2>Not guessing.</h2>
                <p className="lock-detail">
                  {gates.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {outside.map((name) => (
                    <span key={name}>
                      {featureLabel(name)} is {formatFeature(name, atmosphere[name])}. The table covers{" "}
                      {formatFeature(name, trainingRange[name].min)} to {formatFeature(name, trainingRange[name].max)}.
                    </span>
                  ))}
                </p>
              </>
            ) : (
              <>
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
                <p className="uncertainty">
                  Completion has {flexModel.metrics.classCounts.Completion} rows and recall of{" "}
                  {percent(flexModel.metrics.recall.Completion)}. Extinction is the confident class: recall{" "}
                  {percent(flexModel.metrics.recall.Extinction)}.
                </p>
              </>
            )}
            {neighbors[0] ? (
              <p className="match">
                Nearest recorded burn {neighbors[0].row.id}{" "}
                {neighbors[0].row.burnTimeS != null
                  ? `lasted ${neighbors[0].row.burnTimeS} s`
                  : "has no recorded burn time"}
                . That is that droplet test, not a cabin fire.
              </p>
            ) : null}
            <article className="score-card">
              <span>Five-fold accuracy</span>
              <strong>{percent(flexModel.metrics.accuracy)}</strong>
              <span>Always guessing {flexModel.metrics.majorityClass.toLowerCase()} scores {percent(flexModel.metrics.majorityAccuracy)}</span>
            </article>
          </section>
          </aside>
        </section>

        {placeId === "station" ? <StationPanel atmosphere={atmosphere} locked={locked} /> : null}

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

          <div className="sliders">
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
          </div>
          <p className={Math.abs(composition - 1) > 0.05 ? "sum warn" : "sum"}>
            Mole fractions sum to {composition.toFixed(2)}. Rows in the table sum to about 1.
          </p>
        </form>

        <section className="band" id="burns" aria-label="Nearest recorded burns">
          <div className="band-head">
            <h2>Nearest recorded burns</h2>
            <p>Each card opens the FLEX results report on NTRS. These rows have no page of their own.</p>
          </div>
          <ul className="neighbors">
            {neighbors.map(({ row }) => (
              <li key={row.id}>
                <a href={FLEX_REPORT_PAGE} target="_blank" rel="noreferrer">
                  <strong>{row.id}</strong>
                  <span>
                    {row.fuel} · O₂ {row.oxygen.toFixed(2)} · {row.pressureAtm.toFixed(2)} atm
                  </span>
                  <span className={`ending ending-${row.ending.toLowerCase()}`}>Recorded {row.ending}</span>
                  <span>{row.burnTimeS != null ? `${row.burnTimeS} s recorded` : "Burn time not recorded"}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div id="ask">
          <Assistant atmosphere={atmosphere} prediction={prediction} hold={gates[0] ?? null} />
        </div>

        <ToolBench
          context={context}
          onContext={setContext}
          onApply={(preset) => applyPreset(preset, setAtmosphere, setContext)}
          locked={locked}
          ending={prediction.top}
          nearestId={neighbors[0]?.row.id}
        />

        <div className="facts">
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

        <ChallengeBrief />

        <section className="reports" id="reports">
          <h2>Ranked NTRS reports</h2>
          <p className="lede">
            The assistant cites only this list. Each report documents the FLEX droplet burns or the extinction physics
            in the PSI-69 table.
          </p>
          <ol className="report-list">
            {REPORTS.map((report) => (
              <li key={report.ntrsId}>
                <a href={report.url} target="_blank" rel="noreferrer">
                  <strong>{report.ntrsId}</strong>
                  <span>{report.title}</span>
                </a>
                <p>{report.note}</p>
              </li>
            ))}
          </ol>
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
        </div>
      </main>

      <footer>
        <p>
          Training file: PSI-69 experimental table ·{" "}
          <a href={FLEX_REPORT_PAGE} target="_blank" rel="noreferrer">
            Flame Extinguishment Experiment results
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

function selectPlace(
  id: PlaceUse,
  setPlaceId: (id: PlaceUse) => void,
  setAtmosphere: (value: Atmosphere | ((current: Atmosphere) => Atmosphere)) => void,
  setContext: (value: BenchContext | ((current: BenchContext) => BenchContext)) => void,
) {
  const place = PLACE_USES.find((item) => item.id === id) ?? PLACE_USES[1];
  setPlaceId(place.id);
  setContext((current) => ({ ...current, gravity: place.gravity }));
  if (id === "spacecraft") {
    setAtmosphere((current) => ({
      ...current,
      oxygen: 0.21,
      nitrogen: 0.79,
      carbonMonoxide: 0,
      helium: 0,
      pressureAtm: 1,
    }));
  }
  if (id === "station") {
    setAtmosphere(atmosphereFromPreset(flexModel.presets[0]));
  }
  if (id === "surface" || id === "rover") {
    const moon = ATMOSPHERE_PRESETS.find((item) => item.id === "moon");
    if (!moon) return;
    setAtmosphere((current) => ({
      ...current,
      oxygen: moon.oxygen,
      nitrogen: moon.nitrogen,
      carbonMonoxide: moon.carbonMonoxide,
      helium: moon.helium,
      pressureAtm: Number(psiToAtm(moon.psi).toFixed(4)),
    }));
  }
}

function applyPreset(
  preset: AtmospherePreset,
  setAtmosphere: (value: Atmosphere | ((current: Atmosphere) => Atmosphere)) => void,
  setContext: (value: BenchContext | ((current: BenchContext) => BenchContext)) => void,
) {
  setAtmosphere((current) => ({
    ...current,
    oxygen: preset.oxygen,
    nitrogen: preset.nitrogen,
    carbonMonoxide: preset.carbonMonoxide,
    helium: preset.helium,
    pressureAtm: Number(psiToAtm(preset.psi).toFixed(4)),
  }));
  setContext((current) => ({ ...current, gravity: preset.gravity }));
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

function formatFeature(name: NumericFeature, value: number): string {
  if (name === "pressureAtm") return `${value.toFixed(2)} atm`;
  if (name === "diameterMm") return `${value.toFixed(2)} mm`;
  return value.toFixed(2);
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
