# LUMEN

DIU Smart X, Dhaka local event, NASA Space Apps Challenge 2026.

Challenge: [Flame in Freefall](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall-ai-powered-fire-safety-insights-from-microgravity-combustion-data/).

## Model

A gradient-boosted classifier predicts how an International Space Station droplet burn ends: extinction, disruption, or completion.

Training table: PSI-69, Flame Extinguishment Experiment, from the Physical Sciences Informatics repository listed on [data.nasa.gov](https://data.nasa.gov/dataset/?q=Physical+Sciences+Informatics). The file is `data/nasa/FLEX.csv`. 261 of 274 rows have a pressure, a droplet diameter, and a test-end label.

Five-fold accuracy is about 75%. Always guessing extinction, the majority ending, scores about 69%.

BASS, BASS-II, FLEX-2, and ACME BRE tables are downloaded beside it. Their public experimental tables do not carry the same row-level ending label, so they are not in this fit.

## Assistant

Under the readout, "Ask about this prediction" answers questions about the current chamber. It is grounded, not a free chat: the browser builds a JSON grounding from the prediction, the five nearest PSI-69 burns (`src/model/neighbors.ts`), real model evaluations at nearby chambers, and the held-out metrics. A language model may phrase the answer; it never computes a number, and every answer is labelled with its source.

- No model configured or network off: the deterministic explainer in `src/assistant/offline.ts` answers from the same grounding ("computed from the table").
- Model configured: `server/index.mjs` calls it with the grounding and caches answers in `cache/`. `npm run freeze` copies cached answers into `demo_fixtures/chat.json` so rehearsed questions answer identically offline.

```bash
cp .env.example .env      # Azure GPT-5.4-mini from the DIU Ai Assistant project
npm run server            # http://127.0.0.1:8787, proxied as /api by Vite
npm run dev               # the page
```

Or both together: `npm run dev:all`. A live answer is labelled **language model · gpt-5.4-mini**. Without the server the same questions still answer from the table.

AI use is documented in `docs/AI_USE.md`.

## Run

```bash
npm install
npm test
npm run dev
```

Regenerate the row table the assistant searches (same filter as training):

```bash
.venv/bin/python ml/export_rows.py
```

Retrain with the project virtualenv:

```bash
python3 -m venv .venv
.venv/bin/pip install scikit-learn numpy
.venv/bin/python ml/train_flex.py
```
