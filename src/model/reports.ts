/** Ranked NTRS reports that document the FLEX / PSI-69 droplet burns or the extinction physics those burns measured.
 * Ids were taken from the public NTRS search API. The assistant may cite only this list.
 */
export interface Report {
  rank: number;
  ntrsId: string;
  title: string;
  url: string;
  note: string;
}

export const PSI_69_PAGE = "https://psi.nasa.gov/physci/repo/data/investigations/PSI-69";

/** NTRS record page. The PSI site stays blank, and the full PDF is about 43 MB. */
export const FLEX_REPORT_PAGE = "https://ntrs.nasa.gov/citations/20150023456";

const page = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;

export const REPORTS: Report[] = [
  {
    rank: 1,
    ntrsId: "20150023456",
    title: "Detailed Results from the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011",
    url: FLEX_REPORT_PAGE,
    note: "The flight-results report for the burns in the PSI-69 table.",
  },
  {
    rank: 2,
    ntrsId: "20210022617",
    title: "Isolated Single Droplet Combustion: FLEX Experiments onboard the International Space Station",
    url: page("20210022617"),
    note: "Single-droplet FLEX burns on the station, the same family as PSI-69.",
  },
  {
    rank: 3,
    ntrsId: "20090014812",
    title: "Multi-User Droplet Combustion Apparatus - Flame Extinguishment Experiment",
    url: page("20090014812"),
    note: "The MDCA hardware that ran the FLEX droplet tests.",
  },
  {
    rank: 4,
    ntrsId: "20120015928",
    title: "FLEX: A Decisive Step Forward in NASA's Combustion Research Program",
    url: page("20120015928"),
    note: "Why the FLEX campaign was flown.",
  },
  {
    rank: 5,
    ntrsId: "20130014061",
    title: "Methanol Droplet Combustion in Oxygen-Inert Environments in Microgravity",
    url: page("20130014061"),
    note: "Methanol in oxygen-inert mixtures, the fuel and atmospheres in most PSI-69 rows.",
  },
  {
    rank: 6,
    ntrsId: "20140006750",
    title: "Cool-flame Extinction During N-Alkane Droplet Combustion in Microgravity",
    url: page("20140006750"),
    note: "Extinction of alkane droplets, including the cool-flame ending FLEX recorded.",
  },
  {
    rank: 7,
    ntrsId: "20190002838",
    title: "Three Stage Cool Flame Droplet Burning Behavior of n-Alkane Droplets at Elevated Pressure Conditions",
    url: page("20190002838"),
    note: "How pressure changes hot, warm, and cool droplet flames.",
  },
  {
    rank: 8,
    ntrsId: "19990054071",
    title: "Dynamics of Droplet Extinction in Slow Convective Flows",
    url: page("19990054071"),
    note: "Extinction when buoyancy is weak, the regime of the station burns.",
  },
  {
    rank: 9,
    ntrsId: "19970020619",
    title: "Influences of Water on Methanol Droplet Burning and Extinction",
    url: page("19970020619"),
    note: "Methanol extinction, the majority fuel in PSI-69.",
  },
  {
    rank: 10,
    ntrsId: "20040000941",
    title: "A Treatment of Measurements of Heptane Droplet Combustion Aboard MSL-1",
    url: page("20040000941"),
    note: "Heptane droplet burns in orbit, the other fuel in the table.",
  },
  {
    rank: 11,
    ntrsId: "20010074052",
    title: "Some Recent Observations on the Burning of Isolated N-Heptane and Alcohol Droplets",
    url: page("20010074052"),
    note: "Heptane and alcohol droplets, the two fuels LUMEN classifies.",
  },
  {
    rank: 12,
    ntrsId: "19990019805",
    title: "Droplet Combustion Experiment (DCE)",
    url: page("19990019805"),
    note: "The earlier shuttle droplet experiment that FLEX continued.",
  },
];
