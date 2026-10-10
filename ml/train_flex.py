"""Train a flame-ending classifier on the NASA PSI FLEX experimental table.

The table is PSI-69, downloaded from the Physical Sciences Informatics
repository listed on data.nasa.gov. Each row is an International Space
Station droplet burn. The label is the table column "Test end".
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, f1_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

ROOT = Path(__file__).resolve().parents[1]
TABLE = ROOT / "data" / "nasa" / "FLEX.csv"
OUT = ROOT / "src" / "model" / "flexModel.json"

COLUMNS = {
    "oxygen": "O initial ambient composition; mole fraction",
    "nitrogen": "N initial ambient composition; mole fraction",
    "carbonMonoxide": "CO initial ambient composition; mole fraction",
    "helium": "He initial ambient composition; mole fraction",
    "pressureMmHg": "Ambient pressure; mmHg",
    "diameterMm": "Droplet initial diameter; mm",
}
FEATURE_NAMES = [
    "oxygen",
    "nitrogen",
    "carbonMonoxide",
    "helium",
    "pressureAtm",
    "diameterMm",
    "fuelHeptane",
]


def load_rows() -> list[dict]:
    with TABLE.open(encoding="latin1", newline="") as handle:
        return list(csv.DictReader(handle))


def usable(row: dict) -> bool:
    if not (row.get("Test end") or "").strip():
        return False
    if not (row.get("Fuel") or "").strip():
        return False
    try:
        pressure = float(row[COLUMNS["pressureMmHg"]])
        diameter = float(row[COLUMNS["diameterMm"]])
        for key in ("oxygen", "nitrogen", "carbonMonoxide", "helium"):
            float(row[COLUMNS[key]])
    except (TypeError, ValueError):
        return False
    return pressure > 0 and diameter > 0


def features(row: dict) -> list[float]:
    fuel = row["Fuel"].strip().lower()
    return [
        float(row[COLUMNS["oxygen"]]),
        float(row[COLUMNS["nitrogen"]]),
        float(row[COLUMNS["carbonMonoxide"]]),
        float(row[COLUMNS["helium"]]),
        float(row[COLUMNS["pressureMmHg"]]) / 760.0,
        float(row[COLUMNS["diameterMm"]]),
        1.0 if fuel == "heptane" else 0.0,
    ]


def make_model() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_depth=3,
        learning_rate=0.08,
        max_iter=200,
        random_state=7,
    )


def softmax(scores: np.ndarray) -> np.ndarray:
    shifted = scores - scores.max()
    weights = np.exp(shifted)
    return weights / weights.sum()


def export_trees(clf: HistGradientBoostingClassifier) -> list[list[list[list[float]]]]:
    exported: list[list[list[list[float]]]] = []
    for iteration in clf._predictors:
        classes: list[list[list[float]]] = []
        for tree in iteration:
            nodes: list[list[float]] = []
            for node in tree.nodes:
                nodes.append(
                    [
                        int(node["feature_idx"]),
                        round(float(node["num_threshold"]), 8),
                        int(node["left"]),
                        int(node["right"]),
                        round(float(node["value"]), 8),
                        int(node["is_leaf"]),
                    ]
                )
            classes.append(nodes)
        exported.append(classes)
    return exported


def main() -> None:
    source_rows = load_rows()
    rows = [row for row in source_rows if usable(row)]
    x = np.array([features(row) for row in rows], dtype=float)
    y = np.array([row["Test end"].strip() for row in rows])
    labels = sorted(set(y.tolist()))
    majority = max(labels, key=lambda label: int((y == label).sum()))

    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=7)
    predicted = cross_val_predict(make_model(), x, y, cv=folds)
    recall = recall_score(y, predicted, labels=labels, average=None, zero_division=0)

    clf = make_model()
    clf.fit(x, y)
    class_order = clf.classes_.tolist()
    if class_order != labels:
        raise SystemExit(f"class order changed: {class_order} vs {labels}")

    importance = permutation_importance(
        clf, x, y, n_repeats=15, random_state=7, scoring="accuracy"
    )

    presets = []
    seen: set[str] = set()
    for row in rows:
        label = row["Test end"].strip()
        if label in seen:
            continue
        seen.add(label)
        raw = np.array(features(row), dtype=float)
        probabilities = clf.predict_proba(raw.reshape(1, -1))[0]
        presets.append(
            {
                "id": (row["FLEX Identifier"] or row["FLEX Test #"]).strip(),
                "testNumber": row["FLEX Test #"].strip(),
                "fuel": row["Fuel"].strip(),
                "actual": label,
                "input": {
                    "oxygen": raw[0],
                    "nitrogen": raw[1],
                    "carbonMonoxide": raw[2],
                    "helium": raw[3],
                    "pressureAtm": round(float(raw[4]), 4),
                    "diameterMm": float(raw[5]),
                },
                "probabilities": {
                    name: round(float(value), 6)
                    for name, value in zip(class_order, probabilities)
                },
            }
        )

    check_raw = np.array(features(rows[0]), dtype=float)
    check_proba = clf.predict_proba(check_raw.reshape(1, -1))[0]
    model = {
        "accession": "PSI-69",
        "title": "Flame Extinguishment Experiment",
        "table": "PSI-69 experimental table",
        "rowsUsed": int(len(rows)),
        "rowsInFile": len(source_rows),
        "features": FEATURE_NAMES,
        "classes": class_order,
        "baseline": [round(float(value), 8) for value in np.ravel(clf._baseline_prediction)],
        "trees": export_trees(clf),
        "importance": {
            name: round(float(value), 4)
            for name, value in zip(FEATURE_NAMES, importance.importances_mean)
        },
        "metrics": {
            "method": "5-fold stratified cross-validation; the shipped trees are refit on every usable row",
            "accuracy": round(float(accuracy_score(y, predicted)), 4),
            "macroF1": round(float(f1_score(y, predicted, average="macro")), 4),
            "majorityClass": majority,
            "majorityAccuracy": round(float((y == majority).mean()), 4),
            "recall": {
                name: round(float(value), 4) for name, value in zip(labels, recall)
            },
            "classCounts": {label: int((y == label).sum()) for label in class_order},
        },
        "presets": presets,
        "check": {
            "features": [round(float(value), 8) for value in check_raw],
            "probabilities": [round(float(value), 6) for value in check_proba],
        },
    }
    OUT.write_text(json.dumps(model) + "\n", encoding="utf-8")
    print(json.dumps(model["metrics"], indent=2))
    print("importance", model["importance"])
    print("bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
