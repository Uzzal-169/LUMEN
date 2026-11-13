import { useMemo, useState } from "react";
import {
  ATMOSPHERE_PRESETS,
  GRAVITY_LABEL,
  SAFFIRE_DEMO,
  SENSORS,
  SMOKE_DEMO,
  bass2Rows,
  bassRows,
  contextNotes,
  demoSmokeFlag,
  handoffLines,
  matchMaterials,
  psiToAtm,
  type AtmospherePreset,
  type BenchContext,
  type Gravity,
} from "../model/tools";

export function ToolBench({
  context,
  onContext,
  onApply,
  locked,
  ending,
  nearestId,
}: {
  context: BenchContext;
  onContext: (context: BenchContext) => void;
  onApply: (preset: AtmospherePreset) => void;
  locked: boolean;
  ending: string;
  nearestId: string | undefined;
}) {
  const [query, setQuery] = useState("PMMA");
  const [smokeId, setSmokeId] = useState<(typeof SMOKE_DEMO)[number]["id"]>(SMOKE_DEMO[0].id);
  const hits = useMemo(() => matchMaterials(query), [query]);
  const smoke = SMOKE_DEMO.find((row) => row.id === smokeId) ?? SMOKE_DEMO[0];
  const note = handoffLines({ locked, ending, nearestId, context });

  return (
    <section className="scope" id="tools">
      <h2>Tools</h2>
      <p className="lede">
        Prevention reads the BASS tables already in the repository. Detection, Saffire, temperature, air speed, and
        the sensor name run on labeled demo inputs until those NASA tables are added. None of them change the FLEX
        score except the pressure buttons, and only while gravity stays on microgravity.
      </p>

      <h3>Reference atmospheres</h3>
      <div className="places">
        {ATMOSPHERE_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="place" onClick={() => onApply(preset)}>
            <strong>{preset.label}</strong>
            <span>
              {preset.psi.toFixed(1)} psi · {psiToAtm(preset.psi).toFixed(2)} atm
            </span>
          </button>
        ))}
      </div>
      <div className="sliders tool-fields">
        <label className="field">
          <span>
            Gravity
            <b>{GRAVITY_LABEL[context.gravity]}</b>
          </span>
          <select
            value={context.gravity}
            onChange={(event) => onContext({ ...context, gravity: event.target.value as Gravity })}
          >
            {(Object.keys(GRAVITY_LABEL) as Gravity[]).map((gravity) => (
              <option key={gravity} value={gravity}>
                {GRAVITY_LABEL[gravity]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            Temperature
            <b>{context.temperatureC.toFixed(0)}°C</b>
          </span>
          <input
            type="number"
            min={-20}
            max={80}
            value={context.temperatureC}
            onChange={(event) => onContext({ ...context, temperatureC: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Air speed
            <b>{context.airSpeedCmS.toFixed(1)} cm/s</b>
          </span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={context.airSpeedCmS}
            onChange={(event) => onContext({ ...context, airSpeedCmS: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Sensor label
            <b>{context.sensor}</b>
          </span>
          <select value={context.sensor} onChange={(event) => onContext({ ...context, sensor: event.target.value })}>
            {SENSORS.map((sensor) => (
              <option key={sensor} value={sensor}>
                {sensor}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="tool-notes">
        {contextNotes(context).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3>Prevention · BASS and BASS-II</h3>
      <p className="place-detail">
        {bassRows.length} BASS rows and {bass2Rows.length} BASS-II rows. Neither file records when a sample ignites, so
        this tool lists the matching tests. It does not invent an ignition temperature.
      </p>
      <label className="field">
        <span>Material</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Material search" />
      </label>
      <ul className="tool-hits">
        {hits.length === 0 ? <li>No matching row in the downloaded tables.</li> : null}
        {hits.map((hit) => (
          <li key={`${hit.investigation}-${hit.id}`}>
            <strong>
              {hit.investigation} · {hit.id}
            </strong>
            <span>
              {hit.material}
              {hit.date ? ` · ${hit.date}` : ""}
            </span>
            <span>{hit.detail}</span>
          </li>
        ))}
      </ul>

      <h3>Saffire-I, II, and III · demo log</h3>
      <p className="demo-flag">Demo. Not a NASA measurement. The statement names three Saffire flights. None of those tables is in this repository.</p>
      <ul className="tool-hits">
        {SAFFIRE_DEMO.map((row) => (
          <li key={row.id}>
            <strong>{row.id}</strong>
            <span>
              {row.material} · O₂ {row.oxygenPct}%
            </span>
            <span>Placeholder row. It does not say when the sample ignites.</span>
          </li>
        ))}
      </ul>

      <h3>Detection · SAME and SAME-R demo</h3>
      <p className="demo-flag">Demo. No SAME table is in the repository. The threshold is a placeholder rule.</p>
      <div className="places">
        {SMOKE_DEMO.map((row) => (
          <button
            key={row.id}
            type="button"
            className="place"
            aria-pressed={row.id === smoke.id}
            onClick={() => setSmokeId(row.id)}
          >
            <strong>{row.id}</strong>
            <span>
              {row.reading.toFixed(2)} {row.unit}
            </span>
          </button>
        ))}
      </div>
      <p className="place-detail">{demoSmokeFlag(smoke.reading, smoke.threshold)}</p>

      <h3>Instrument handoff</h3>
      <ul className="tool-notes">
        {note.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
