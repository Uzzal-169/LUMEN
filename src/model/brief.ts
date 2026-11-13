/** October challenge briefing. Descriptive only. The fitted model remains PSI-69 suppression. */

export type ThreadId = "prevention" | "detection" | "suppression";

export interface Thread {
  id: ThreadId;
  title: string;
  question: string;
  investigations: string;
  fit: string;
}

export const THREADS: Thread[] = [
  {
    id: "prevention",
    title: "Prevention",
    question: "When does a material ignite?",
    investigations: "BASS, BASS-II, Saffire-I, II, and III",
    fit: "BASS and BASS-II are downloaded. They have no FLEX ending label, so they are not in the fit. Saffire-I, II, and III are not in this repository.",
  },
  {
    id: "detection",
    title: "Detection",
    question: "How is smoke measured?",
    investigations: "SAME, SAME-R",
    fit: "Named in the statement. No SAME table is here, and this model does not detect smoke. A SAME instrument was later used for dust in DAFT and DAFT-2. Those tables are not here either.",
  },
  {
    id: "suppression",
    title: "Suppression",
    question: "How does the flame end?",
    investigations: "FLEX",
    fit: "This is the fitted model. The statement says FLEX suppressed fire by diluting the chamber with carbon dioxide and helium. PSI-69 records helium and a column named CO beside oxygen and nitrogen.",
  },
];

export type PlaceId = "spacecraft" | "station" | "surface" | "rover";

export interface Place {
  id: PlaceId;
  label: string;
  thread: ThreadId;
  scored: boolean;
  detail: string;
}

export const PLACES: Place[] = [
  {
    id: "spacecraft",
    label: "Spacecraft",
    thread: "suppression",
    scored: true,
    detail:
      "A droplet in a vehicle atmosphere is the FLEX case. LUMEN can score that mix. Prevention and smoke detection stay named and unfitted.",
  },
  {
    id: "station",
    label: "Station",
    thread: "suppression",
    scored: true,
    detail:
      "The PSI-69 burns flew on the station. The model screens a mix like those burns. It does not watch the cabin.",
  },
  {
    id: "surface",
    label: "Moon or Mars surface",
    thread: "suppression",
    scored: false,
    detail:
      "The statement expects Moon-base oxygen at 30% or higher and pressure at 10.2 psi or lower, more than 40% richer in oxygen than Earth’s 21%. PSI has no partial-gravity combustion rows. Later data may come from LUCI and FM2. Gravity is not a model input, so this surface is not scored.",
  },
  {
    id: "rover",
    label: "Pressurized rover",
    thread: "suppression",
    scored: false,
    detail:
      "A pressurized rover is in the statement’s list of places. It is not a FLEX row, and there is no partial-gravity table to fit. The droplet model is not applied.",
  },
];

export const ROCKET_LIMIT =
  "Rocket propellant is outside the PSI research this challenge uses. Engine speeds make that combustion effectively independent of gravity.";

export const HARDWARE = [
  {
    title: "ACME",
    where: "Combustion Integrated Rack (CIR)",
    note: "Six gaseous-fuel experiments on one modular ACME set in the CIR. BRE is downloaded and left out of the fit. The statement calls BRE a still-atmosphere flammability study.",
  },
  {
    title: "FLEX, FLEX-2, CFI",
    where: "Liquid droplets on MDCA, in the CIR",
    note: "Only FLEX (PSI-69) is fitted. FLEX-2 here is a summary sheet, not row endings. CFI, including CFI-G, is not a separate table here.",
  },
  {
    title: "BASS, BASS-II, SPICE, SLICE",
    where: "Microgravity Science Glovebox (MSG)",
    note: "The statement says these used the fan-driven flow duct built for SPICE. BASS and BASS-II are downloaded and unused. SPICE and SLICE are not in this repository.",
  },
];

export const REFERENCES = [
  { label: "Earth sea level", value: "14.7 psi" },
  { label: "Lunar surface, briefing", value: "Oxygen likely 30% or higher, pressure 10.2 psi or lower" },
  { label: "Suit", value: "100% oxygen at 4.3 psi" },
];

export const FLEX_CARRIES = [
  "Fuel",
  "Droplet diameter",
  "Oxygen, nitrogen, helium, and the CO column",
  "Pressure",
  "Burn time and the recorded ending",
];

export const FLEX_OMITS = [
  "Sample temperature",
  "Air speed",
  "Which sensor recorded the row",
  "Gravity level",
];

export const AUDIENCE =
  "Professors, graduate students, undergraduate students, aerospace researchers, and aerospace engineers.";

export const LATER_USE =
  "The statement names ISS fine-water-mist extinguishers, Earth smoke detectors, and firefighter clothing and air tanks as later uses. This page does not build them. A later instrument can take the extinction boundary, the out-of-range lock, and the nearest recorded burn.";

export const STATEMENT_GAPS = [
  "CFI-G ran the highest oxygen: a nitrogen and fuel-gas chamber, with up to 85% oxygen from the burner, an inside-out flame. That table is not here, so it is not scored.",
  "ACME E-FIELD Flames mimicked partial gravity with an electric field on flame ions. Those rows are not here.",
  "Microgravity and Earth results can bound intermediate gravity. They are not a substitute for the missing lunar-g rows.",
];
