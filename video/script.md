# LUMEN — 240-second local judging video, voice script

Team: DIU Smart X · Dhaka · NASA Space Apps 2026 · Flame in Freefall

Total length: 240 s · 595 words (about 149 words per minute, a calm pace).

How to record: one speaker reads every line below in order, in a quiet room, phone or laptop mic
about 20 cm from the mouth. Pause for a breath where a new timestamp starts. Do not rush the
demo section; the on-screen actions are timed to these cues. Save as WAV or M4A and drop the file
in `video/out/narration.wav`, then run `node video/build.mjs --mix`.

Before recording, replace the bracketed names in `video/narration.mjs` and rerun
`node video/text.mjs` so this script and the subtitles match. Nobody under 18 may be named or shown.

## 0:00 – 0:20 · title

*On screen:* Title card: LUMEN, the one-line description, the three ending pills.

**0:01** On Earth a flame points up, because hot gas rises. On the Space Station there is no up.

**0:06** A burning droplet turns into a sphere, burns slowly, and can survive in air that would put it out on the ground.

**0:14** We are DIU Smart X from Dhaka, and this is LUMEN, our entry for Flame in Freefall.

## 0:20 – 0:45 · team

*On screen:* Team card with names and roles. Swap for the team's own phone clip in the final cut if you have one.

**0:21** Our team has 4 members. [Member 1] leads the machine learning.

**0:26** [Member 2] built the interface. [Member 3] handles the NASA data.

**0:32** [Member 4] leads the pitch and documentation.

**0:38** We are students at Daffodil International University, competing at the Dhaka local event of NASA Space Apps 2026.

## 0:45 – 1:15 · problem

*On screen:* Problem card: four bullets on microgravity fire.

**0:46** The challenge, Flame in Freefall, asks us to apply AI to decades of microgravity combustion research and turn it into fire-safety insight for spacecraft.

**0:53** NASA has run hundreds of droplet burns on the station. The results sit in tables that a flight engineer cannot read in a hurry.

**1:01** We also wanted to avoid the trap this challenge sets: a chat window over some PDFs is not a fire-safety tool.

**1:08** So the question we answer is simple. Given a chamber atmosphere, how will this flame end?

## 1:15 – 1:50 · data

*On screen:* Data card: PSI-69 / FLEX identity, counts, and the first six rows of data/nasa/FLEX.csv.

**1:16** Our data is NASA's PSI-69 record: the Flame Extinguishment Experiment, FLEX, from the Physical Sciences Informatics repository listed on data.nasa.gov.

**1:23** The table holds 274 station burns. 261 of them carry a pressure, a droplet diameter and a labelled ending.

**1:30** The seven features are oxygen, nitrogen, carbon monoxide and helium mole fractions, chamber pressure, droplet diameter, and the fuel: methanol or heptane.

**1:39** The three endings are extinction, disruption and completion.

**1:44** The whole table and the trained model are committed to the repository, so anyone can rerun the fit.

## 1:50 – 3:25 · demo

*On screen:* Screen recording of the app. 20CAL10 → Extinction 87%. 20CAL08 → Disruption 74%. Oxygen slider 0.21 → 0.20 flips to Extinction 92%, down to 0.16 = 100%. Back up to 0.30 = Disruption 94%. 192F001 → Completion 58%. Scroll to Held-out score, then What the model uses.

**1:51** This is LUMEN running in a browser, fully offline. The model is a gradient-boosted classifier trained on that table.

**1:57** It is exported to JSON and evaluated inside the page. No server, no network call.

**2:03** We start with a recorded station test, 20CAL10. Methanol, 21 percent oxygen, one atmosphere.

**2:09** The station recorded extinction. The model says extinction, with 87 percent confidence.

**2:15** Now test 20CAL08: nearly the same atmosphere, a slightly smaller droplet. The station saw the droplet disrupt.

**2:21** The model agrees: disruption, 74 percent.

**2:26** Here is the moment that matters. We lower oxygen one percent at a time.

**2:31** Twenty-one percent: disruption. Twenty percent, and the prediction flips to extinction at 92 percent.

**2:37** By 16 percent the model is certain the flame goes out.

**2:42** One percent of oxygen is the boundary between a flame that breaks apart and a flame that dies.

**2:48** Push oxygen back up to 30 percent and disruption dominates again.

**2:53** Pick the 34-percent, low-pressure, large-droplet test, and the model expects a completed burn, as the station recorded.

**2:59** We report the score honestly. Five-fold cross-validated accuracy is 75 percent.

**3:05** Always guessing extinction, the most common ending, scores 69 percent.

**3:10** Recall is 88 percent for extinction, 60 for disruption, and only 22 for completion, which has just 27 rows.

**3:16** Permutation importance shows what the model actually uses: oxygen first, then droplet diameter, pressure, and fuel.

**3:21** That matches the physics, which is the check we wanted.

## 3:25 – 3:50 · impact

*On screen:* Impact card: four bullets, including the 75% vs 69% figure.

**3:26** Why it matters. A spacecraft atmosphere is a design choice: oxygen fraction, diluent, pressure.

**3:31** LUMEN gives an engineer a one-second answer grounded in real station data, with its own held-out score printed next to the result.

**3:38** Next we add the BASS and ACME datasets, an out-of-range warning, an uncertainty display, and a retrieval layer that cites the exact experiment behind each prediction.

## 3:50 – 4:00 · close

*On screen:* Close card: repository link, dataset line, thank you.

**3:51** Everything is open source under Apache 2.0, with every dataset cited. The code is at github.com/[your-org]/lumen.

**3:56** We are DIU Smart X. Thank you.
