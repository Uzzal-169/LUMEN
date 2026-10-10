"""Export the usable PSI-69 rows for the in-browser assistant.

Writes src/model/flexRows.json: one record per row that train_flex.py also
uses, so the assistant's nearest-experiment lookup sees exactly the training
table. Run with the project virtualenv: .venv/bin/python ml/export_rows.py
"""

from __future__ import annotations

import json

from train_flex import COLUMNS, OUT, TABLE, features, load_rows, usable

ROWS_OUT = OUT.with_name("flexRows.json")


def optional_float(value: str | None) -> float | None:
    try:
        number = float((value or "").strip())
    except ValueError:
        return None
    return number


def main() -> None:
    records = []
    for row in load_rows():
        if not usable(row):
            continue
        raw = features(row)
        records.append(
            {
                "id": (row["FLEX Identifier"] or row["FLEX Test #"]).strip(),
                "testNumber": row["FLEX Test #"].strip(),
                "date": (row.get("Test Date") or "").strip(),
                "fuel": row["Fuel"].strip(),
                "oxygen": raw[0],
                "nitrogen": raw[1],
                "carbonMonoxide": raw[2],
                "helium": raw[3],
                "pressureAtm": round(raw[4], 4),
                "diameterMm": raw[5],
                "ending": row["Test end"].strip(),
                "extinctionDiameterMm": optional_float(row.get("Visible flame extinction diameter; mm")),
                "burningRateMm2s": optional_float(row.get("Burning rate; mm")),
                "burnTimeS": optional_float(row.get("Burn time; s")),
            }
        )
    payload = {
        "accession": "PSI-69",
        "source": str(TABLE.relative_to(TABLE.parents[2])),
        "columns": COLUMNS,
        "rows": records,
    }
    ROWS_OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    print("rows", len(records), "bytes", ROWS_OUT.stat().st_size)


if __name__ == "__main__":
    main()
