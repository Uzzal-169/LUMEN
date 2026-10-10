# Flame in Freefall — chapter from the Space Apps 2026 Bangladesh Build Guide

Source: https://claude.ai/artifact/QRbkqRngCEhJZCPzxapCwT (shared in the Bangladesh local-event group). Full text: docs/spaceapps-2026-bd-build-guide.txt

```text
Flame in Freefall

 AI & microgravity safety Advanced Intermediate 

 What the challenge asks

 Apply AI to decades of microgravity combustion research to produce fire-safety insight for spacecraft. Fire behaves differently without buoyancy — flames become spherical, spread slowly, and can survive in conditions that would extinguish them on Earth.

 The build

 A flammability explorer. Set oxygen concentration, pressure, flow velocity and material, and a model trained on published microgravity combustion results predicts the flame-spread regime, with an explanation layer that cites the experiments behind the prediction.

 Killer demo
 Slide oxygen from 21 down to 17 percent. The prediction crosses a boundary and the explanation names the experiments on either side of that boundary, with their report identifiers.

 Where the points are

 This challenge explicitly asks for AI, which is a trap and an opportunity. The opportunity: a trained model plus a retrieval layer over real NASA reports scores well on Creativity and Relevance. The trap: a chat interface over some PDFs is a 5 on validity. Show the training data, the features, and an honest accuracy figure.

 Before the event
 Gather microgravity combustion reports from NTRS and OSDR, extract a tabular dataset of conditions and outcomes, and commit both the table and a trained model artifact. Data extraction is the slow part and it must be done in advance.

 Day 1 morning
 Feature engineering and a baseline classifier with honest cross-validation. Report the accuracy you actually get.

 Day 1 afternoon
 Serve the model, build the slider interface, show the decision boundary.

 Day 1 evening
 Retrieval over the report corpus, so each prediction links to the nearest real experiments. Record by 18:30.

 Day 2 morning
 Uncertainty display, the out-of-range warning, and the safety framing for a spacecraft operator.

 Day 2 noon
 Freeze, record, submit.

 Pre-build
 Extracted experiment table
 Report corpus with identifiers
 Trained model artifact committed

 Cut in this order
 Classification only, drop regression
 Fixed presets instead of free sliders
 Retrieval over titles instead of full text

 NTRS — the primary source. Microgravity combustion reports including the FLEX and SoFIE experiment families, downloadable as PDFs with citable identifiers.

 NASA OSDR — spaceflight experiment records and metadata.

 NASA Glenn physical sciences resources — combustion experiment documentation and imagery.

 Never extrapolate silently. If the requested conditions fall outside the range of your training data, the interface must say so and refuse to predict. A fire-safety tool that quietly guesses is worse than no tool, and a judge will ask.

 The prediction object, with its limits attached
 {
 "inputs": {"oxygen_pct": 17.0, "pressure_kpa": 101.3,
 "flow_cm_s": 5.0, "material": "PMMA"},
 "in_training_range": true,
 "prediction": "marginal_spread",
 "probabilities": {"no_spread": 0.28, "marginal_spread": 0.57, "spread": 0.15},
 "model": {"type": "gradient_boosting", "n_train": 184,
 "cv_accuracy": 0.79, "features": ["oxygen_pct","pressure_kpa","flow_cm_s","material"]},
 "nearest_experiments": [
 {"report_id": "NTRS 20205008xxx", "oxygen_pct": 17.5, "outcome": "marginal_spread",
 "source_url": "https://ntrs.nasa.gov/citations/20205008xxx"}
 ]
} 

 NTRS reports + OSDR records
 │ (pre-event extraction)
 ▼
 experiments.parquet ──► report corpus + index
 │ │
 ▼ │
 src/compute/model.py │
 train · cross-validate · save │
 │ │
 ▼ ▼
 FastAPI /predict retrieval: nearest
 │ real experiments
 └───────┬────────────────┘
 ▼
 slider interface
 prediction · probabilities · range guard
 │
 ▼
 explanation citing report ids 

 Paste into your coding agent
 Build a microgravity fire-safety explorer.

Data: cache/experiments.parquet, one row per published microgravity combustion
test with oxygen_pct, pressure_kpa, flow_cm_s, material, sample geometry, the
observed outcome class, and a report_id plus source_url.

src/compute/model.py: train a small gradient-boosting classifier predicting the
flame-spread regime. Report honest stratified cross-validation accuracy and a
confusion matrix. Save the model artifact to the repo. Compute and store the
min and max of every numeric feature as the training range.

API: POST /predict returning the class, class probabilities, the model metadata
including n_train and cv_accuracy, an in_training_range boolean, and the three
nearest real experiments by feature distance with their report ids and URLs.

If in_training_range is false, return no prediction and an explanation that the
requested conditions are outside the published experimental envelope.

Frontend: sliders for oxygen, pressure and flow, a material selector, a
probability bar, a two-dimensional decision-boundary plot with the real
experiments overlaid as points, and a panel listing the nearest experiments with
clickable citations.

The language model writes the explanation only, from the prediction object and
retrieved report abstracts. It never predicts and never states a number that is
absent from the object. Apache-2.0, public repo. 
```
