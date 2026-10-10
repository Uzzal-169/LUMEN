// Single source of truth for the 240-second local-judging video.
// Segments drive the ffmpeg timeline; cues drive subtitles.srt and script.md.
// Times are seconds from the start of the finished video.

export const TEAM = {
  name: "DIU Smart X",
  city: "Dhaka",
  university: "Daffodil International University",
  // Fill these in before recording the narration. Keep everyone 18 or older.
  members: [
    { name: "[Member 1]", role: "Machine learning" },
    { name: "[Member 2]", role: "Interface" },
    { name: "[Member 3]", role: "NASA data" },
    { name: "[Member 4]", role: "Pitch and documentation" },
  ],
  repo: "github.com/[your-org]/lumen",
};

// Each segment becomes one clip in the final cut.
// kind: "card" renders video/cards/<id>.html to a still; "demo" is the Playwright recording.
export const SEGMENTS = [
  { id: "title", kind: "card", start: 0, end: 20 },
  { id: "team", kind: "card", start: 20, end: 45 },
  { id: "problem", kind: "card", start: 45, end: 75 },
  { id: "data", kind: "card", start: 75, end: 110 },
  { id: "demo", kind: "demo", start: 110, end: 205 },
  { id: "impact", kind: "card", start: 205, end: 230 },
  { id: "close", kind: "card", start: 230, end: 240 },
];

export const TOTAL_SECONDS = 240;

// Narration cues. One speaker reads them straight through; the subtitle file
// and the printed script are both generated from this list.
export const CUES = [
  // title 0:00–0:20
  { start: 0.5, end: 6, text: "On Earth a flame points up, because hot gas rises. On the Space Station there is no up." },
  { start: 6, end: 13.5, text: "A burning droplet turns into a sphere, burns slowly, and can survive in air that would put it out on the ground." },
  { start: 13.5, end: 19.5, text: "We are DIU Smart X from Dhaka, and this is LUMEN, our entry for Flame in Freefall." },

  // team 0:20–0:45
  { start: 20.5, end: 26, text: `Our team has ${TEAM.members.length} members. ${TEAM.members[0].name} leads the machine learning.` },
  { start: 26, end: 32, text: `${TEAM.members[1].name} built the interface. ${TEAM.members[2].name} handles the NASA data.` },
  { start: 32, end: 38, text: `${TEAM.members[3].name} leads the pitch and documentation.` },
  { start: 38, end: 44.5, text: `We are students at ${TEAM.university}, competing at the Dhaka local event of NASA Space Apps 2026.` },

  // problem 0:45–1:15
  { start: 45.5, end: 53, text: "The challenge, Flame in Freefall, asks us to apply AI to decades of microgravity combustion research and turn it into fire-safety insight for spacecraft." },
  { start: 53, end: 61, text: "NASA has run hundreds of droplet burns on the station. The results sit in tables that a flight engineer cannot read in a hurry." },
  { start: 61, end: 68, text: "We also wanted to avoid the trap this challenge sets: a chat window over some PDFs is not a fire-safety tool." },
  { start: 68, end: 74.5, text: "So the question we answer is simple. Given a chamber atmosphere, how will this flame end?" },

  // data 1:15–1:50
  { start: 75.5, end: 83, text: "Our data is NASA's PSI-69 record: the Flame Extinguishment Experiment, FLEX, from the Physical Sciences Informatics repository listed on data.nasa.gov." },
  { start: 83, end: 90, text: "The table holds 274 station burns. 261 of them carry a pressure, a droplet diameter and a labelled ending." },
  { start: 90, end: 99, text: "The seven features are oxygen, nitrogen, carbon monoxide and helium mole fractions, chamber pressure, droplet diameter, and the fuel: methanol or heptane." },
  { start: 99, end: 104, text: "The three endings are extinction, disruption and completion." },
  { start: 104, end: 109.5, text: "The whole table and the trained model are committed to the repository, so anyone can rerun the fit." },

  // demo 1:50–3:25 (demo clock = video clock − 110)
  { start: 110.5, end: 117, text: "This is LUMEN running in a browser, fully offline. The model is a gradient-boosted classifier trained on that table." },
  { start: 117, end: 122, text: "It is exported to JSON and evaluated inside the page. No server, no network call." },
  { start: 122.5, end: 128.5, text: "We start with a recorded station test, 20CAL10. Methanol, 21 percent oxygen, one atmosphere." },
  { start: 128.5, end: 134, text: "The station recorded extinction. The model says extinction, with 87 percent confidence." },
  { start: 134.5, end: 140.5, text: "Now test 20CAL08: nearly the same atmosphere, a slightly smaller droplet. The station saw the droplet disrupt." },
  { start: 140.5, end: 145.5, text: "The model agrees: disruption, 74 percent." },
  { start: 146, end: 151, text: "Here is the moment that matters. We lower oxygen one percent at a time." },
  { start: 151, end: 157, text: "Twenty-one percent: disruption. Twenty percent, and the prediction flips to extinction at 92 percent." },
  { start: 157, end: 162, text: "By 16 percent the model is certain the flame goes out." },
  { start: 162, end: 167.5, text: "One percent of oxygen is the boundary between a flame that breaks apart and a flame that dies." },
  { start: 168, end: 173, text: "Push oxygen back up to 30 percent and disruption dominates again." },
  { start: 173, end: 178, text: "Pick the 34-percent, low-pressure, large-droplet test, and the model expects a completed burn, as the station recorded." },
  { start: 178.5, end: 185, text: "We report the score honestly. Five-fold cross-validated accuracy is 75 percent." },
  { start: 185, end: 190, text: "Always guessing extinction, the most common ending, scores 69 percent." },
  { start: 190, end: 195, text: "Recall is 88 percent for extinction, 60 for disruption, and only 22 for completion, which has just 27 rows." },
  { start: 195.5, end: 200.5, text: "Permutation importance shows what the model actually uses: oxygen first, then droplet diameter, pressure, and fuel." },
  { start: 200.5, end: 204.5, text: "That matches the physics, which is the check we wanted." },

  // impact 3:25–3:50
  { start: 205.5, end: 211, text: "Why it matters. A spacecraft atmosphere is a design choice: oxygen fraction, diluent, pressure." },
  { start: 211, end: 218, text: "LUMEN gives an engineer a one-second answer grounded in real station data, with its own held-out score printed next to the result." },
  { start: 218, end: 229.5, text: "Next we add the BASS and ACME datasets, an out-of-range warning, an uncertainty display, and a retrieval layer that cites the exact experiment behind each prediction." },

  // close 3:50–4:00
  { start: 230.5, end: 235.5, text: `Everything is open source under Apache 2.0, with every dataset cited. The code is at ${TEAM.repo}.` },
  { start: 235.5, end: 239.5, text: "We are DIU Smart X. Thank you." },
];
