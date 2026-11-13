import { useState } from "react";
import {
  AUDIENCE,
  FLEX_CARRIES,
  FLEX_OMITS,
  HARDWARE,
  LATER_USE,
  STATEMENT_GAPS,
  PLACES,
  REFERENCES,
  ROCKET_LIMIT,
  THREADS,
  type PlaceId,
} from "../model/brief";

export function ChallengeBrief() {
  const [placeId, setPlaceId] = useState<PlaceId>("station");
  const place = PLACES.find((item) => item.id === placeId) ?? PLACES[1];
  const thread = THREADS.find((item) => item.id === place.thread);

  return (
    <section className="scope" id="brief">
      <h2>What the October statement asked for</h2>
      <p className="lede">
        The 2026 statement asks for an SI-powered dashboard that summarizes, ranks, and interprets the microgravity
        combustion record. LUMEN ranks the nearest PSI-69 burns and fits only FLEX suppression. The other
        investigations are named here and are not in the fit.
      </p>

      <ul className="threads">
        {THREADS.map((item) => (
          <li key={item.id} className={item.id === "suppression" ? "thread on" : "thread"}>
            <strong>{item.title}</strong>
            <span>{item.question}</span>
            <span>{item.investigations}</span>
            <p>{item.fit}</p>
          </li>
        ))}
      </ul>

      <h3>Which investigation a place needs</h3>
      <div className="places" role="group" aria-label="Environment">
        {PLACES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="place"
            aria-pressed={item.id === place.id}
            onClick={() => setPlaceId(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.scored ? "FLEX model applies" : "Not scored"}</span>
          </button>
        ))}
      </div>
      <p className="place-detail">
        <strong>{thread?.title}.</strong> {place.detail}
      </p>
      <p className="rocket">{ROCKET_LIMIT}</p>

      <h3>What one FLEX row carries</h3>
      <div className="two">
        <article>
          <strong>In the PSI-69 row</strong>
          <ul>
            {FLEX_CARRIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <strong>Not in this table</strong>
          <ul>
            {FLEX_OMITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
      <p className="place-detail">
        FLEX-2’s public sheet lists ambient temperature and flow as ranges only. Those ranges are not rows in the fit.
        BASS and ACME use different samples, so their columns are not merged into this model.
      </p>

      <h3>Hardware groups</h3>
      <ul className="hw">
        {HARDWARE.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.where}</span>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>

      <h3>Reference atmospheres in the briefing</h3>
      <ul className="refs">
        {REFERENCES.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>
      <p className="gap-note">
        PSI does not yet include partial-gravity combustion data. These pressures are the statement’s references, not
        model inputs. Suits are 4.3 psi, not an intermediate cabin.
      </p>
      <ul className="tool-notes">
        {STATEMENT_GAPS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3>What a later instrument could take</h3>
      <p>{LATER_USE}</p>
      <p className="audience">Audience: {AUDIENCE}</p>
    </section>
  );
}
