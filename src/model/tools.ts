import catalog from "./catalog.json";

/** Standard atmosphere. Briefing pressures are converted with this constant. */
export const PSI_PER_ATM = 14.695948775;

export function psiToAtm(psi: number): number {
  return psi / PSI_PER_ATM;
}

export type Gravity = "microgravity" | "earth" | "lunar" | "mars" | "suit" | "rover";

export interface BenchContext {
  gravity: Gravity;
  temperatureC: number;
  airSpeedCmS: number;
  sensor: string;
}

export const GRAVITY_LABEL: Record<Gravity, string> = {
  microgravity: "Microgravity, the FLEX case",
  earth: "Earth",
  lunar: "Lunar surface",
  mars: "Mars surface",
  suit: "Suit",
  rover: "Pressurized rover",
};

export type PlaceUse = "spacecraft" | "station" | "surface" | "rover";

export const PLACE_USES: Array<{
  id: PlaceUse;
  label: string;
  gravity: Gravity;
  job: string;
}> = [
  {
    id: "spacecraft",
    label: "Spacecraft",
    gravity: "microgravity",
    job: "Before flight, screen a droplet in the vehicle atmosphere. The FLEX score applies.",
  },
  {
    id: "station",
    label: "Station",
    gravity: "microgravity",
    job: "The PSI-69 burns flew on the station. The FLEX score applies. It does not watch the cabin.",
  },
  {
    id: "surface",
    label: "Moon & Mars",
    gravity: "lunar",
    job: "Base reference: oxygen 30%, 10.2 psi. Partial gravity is not in PSI, so this is not scored.",
  },
  {
    id: "rover",
    label: "Rover",
    gravity: "rover",
    job: "Same intermediate atmosphere as the Moon base. No rover table, so the FLEX score stays off.",
  },
];

export const SENSORS = ["MDCA", "CIR", "MSG", "Radiometer"] as const;

export interface AtmospherePreset {
  id: string;
  label: string;
  psi: number;
  oxygen: number;
  nitrogen: number;
  carbonMonoxide: number;
  helium: number;
  gravity: Gravity;
  note: string;
}

export const ATMOSPHERE_PRESETS: AtmospherePreset[] = [
  {
    id: "earth",
    label: "Earth sea level",
    psi: 14.7,
    oxygen: 0.21,
    nitrogen: 0.79,
    carbonMonoxide: 0,
    helium: 0,
    gravity: "earth",
    note: "14.7 psi. Earth gravity is not in the FLEX table, so the score stays off.",
  },
  {
    id: "moon",
    label: "Lunar surface",
    psi: 10.2,
    oxygen: 0.3,
    nitrogen: 0.7,
    carbonMonoxide: 0,
    helium: 0,
    gravity: "lunar",
    note: "Briefing reference: oxygen 30%, 10.2 psi. Lunar gravity blocks the score.",
  },
  {
    id: "suit",
    label: "Suit",
    psi: 4.3,
    oxygen: 1,
    nitrogen: 0,
    carbonMonoxide: 0,
    helium: 0,
    gravity: "suit",
    note: "The statement: 100% oxygen at 4.3 psi. Outside the FLEX table.",
  },
];

/** Gravity other than microgravity is not a FLEX feature, so the score is withheld. */
export function contextBlocks(context: BenchContext): string[] {
  if (context.gravity === "microgravity") return [];
  return [
    `Gravity is set to ${GRAVITY_LABEL[context.gravity]}. The FLEX model has no gravity input, so this burn is not scored.`,
  ];
}

export function contextNotes(context: BenchContext): string[] {
  const flow =
    context.airSpeedCmS >= 0.1 && context.airSpeedCmS <= 5
      ? "inside the FLEX-2 sheet range of 0.1–5 cm/s"
      : "outside the FLEX-2 sheet range of 0.1–5 cm/s";
  return [
    `Temperature ${context.temperatureC.toFixed(0)}°C is logged. The fitted model has no temperature input. The FLEX-2 sheet lists 25°C.`,
    `Air speed ${context.airSpeedCmS.toFixed(1)} cm/s is logged and is ${flow}. The fitted model has no flow input.`,
    `Sensor label: ${context.sensor}. This names the bench. It is not a measurement.`,
  ];
}

export interface BassRow {
  id: string;
  date: string;
  material: string;
}

export interface Bass2Row extends BassRow {
  oxygenPct: number | null;
  co2Pct: number | null;
  coPpm: number | null;
  fan: string;
  air: string;
}

export const bassRows = catalog.bass as BassRow[];
export const bass2Rows = catalog.bass2 as Bass2Row[];

export interface MaterialHit {
  id: string;
  investigation: "BASS" | "BASS-II";
  date: string;
  material: string;
  detail: string;
}

export function matchMaterials(query: string, limit = 8): MaterialHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: MaterialHit[] = [];
  for (const row of bassRows) {
    if (!row.material.toLowerCase().includes(needle)) continue;
    hits.push({
      id: row.id,
      investigation: "BASS",
      date: row.date,
      material: row.material,
      detail: "Solid sample in the BASS table. No ignition time is recorded.",
    });
    if (hits.length >= limit) return hits;
  }
  for (const row of bass2Rows) {
    if (!row.material.toLowerCase().includes(needle)) continue;
    const oxygen = row.oxygenPct == null ? "O₂ not recorded" : `O₂ ${row.oxygenPct}%`;
    hits.push({
      id: row.id,
      investigation: "BASS-II",
      date: row.date,
      material: row.material,
      detail: `${oxygen} · fan ${row.fan || "—"} · air display ${row.air || "—"}`,
    });
    if (hits.length >= limit) return hits;
  }
  return hits;
}

/** Placeholder rows. Not NASA measurements. Replace when a Saffire I table is added. */
export const SAFFIRE_DEMO = [
  {
    id: "Saffire-I-demo-1",
    material: "Placeholder cotton sample",
    oxygenPct: 21,
  },
  {
    id: "Saffire-I-demo-2",
    material: "Placeholder solid sample",
    oxygenPct: 21,
  },
] as const;

/** Placeholder smoke rows. The threshold is a demo rule, not a NASA limit. */
export const SMOKE_DEMO = [
  {
    id: "SAME-demo-1",
    sensor: "SAME demo photometer",
    reading: 0.12,
    unit: "1/m",
    threshold: 0.2,
  },
  {
    id: "SAME-R-demo-1",
    sensor: "SAME-R demo photometer",
    reading: 0.35,
    unit: "1/m",
    threshold: 0.2,
  },
] as const;

export function demoSmokeFlag(reading: number, threshold: number): string {
  if (reading >= threshold) {
    return `Demo rule fired: ${reading.toFixed(2)} is at or above the placeholder threshold ${threshold.toFixed(2)}. This is not a smoke detection.`;
  }
  return `Demo rule quiet: ${reading.toFixed(2)} is below the placeholder threshold ${threshold.toFixed(2)}. This is not a smoke detection.`;
}

export function handoffLines(input: {
  locked: boolean;
  ending: string;
  nearestId: string | undefined;
  context: BenchContext;
}): string[] {
  const score = input.locked
    ? "Score withheld. Do not pass a flame ending to a device."
    : `FLEX score on this mix: ${input.ending}. Nearest recorded burn: ${input.nearestId ?? "none"}.`;
  return [
    score,
    ...contextNotes(input.context),
    "A later fire-safety instrument could read this note. No instrument is connected.",
    "The statement’s Earth uses are fine-water-mist extinguishers, smoke detectors, and firefighter clothing and air tanks. None of those is built here.",
  ];
}
