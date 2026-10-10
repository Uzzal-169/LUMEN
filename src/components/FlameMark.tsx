import { useEffect, useState } from "react";
import type { Atmosphere, Prediction } from "../model/flex";
import { FlameCanvas } from "./FlameCanvas";

export function FlameMark({
  atmosphere,
  prediction,
}: {
  atmosphere: Atmosphere;
  prediction: Prediction;
}) {
  const [inspect, setInspect] = useState(false);
  const ending = prediction.top;
  const caption =
    ending === "Extinction" ? "Flame dying" : ending === "Disruption" ? "Droplet splitting" : "Flame holding";
  const colour =
    atmosphere.fuel === "Heptane"
      ? "Heptane · sooty yellow-orange (FLEX)"
      : "Methanol · soot-free blue (FLEX)";

  useEffect(() => {
    if (!inspect) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspect(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect]);

  return (
    <figure className={`flame active ending-${ending.toLowerCase()}`}>
      <button type="button" className="flame-open" onClick={() => setInspect(true)} aria-label="Inspect flame at high resolution">
        <FlameCanvas atmosphere={atmosphere} prediction={prediction} variant="panel" />
      </button>
      <figcaption>
        {caption}
        <span>{colour}</span>
        <span>
          O₂ {atmosphere.oxygen.toFixed(2)} · {atmosphere.diameterMm.toFixed(2)} mm · click to zoom
        </span>
      </figcaption>

      {inspect ? (
        <div className="flame-inspect" role="dialog" aria-label="High-resolution flame" onClick={() => setInspect(false)}>
          <div className="flame-inspect-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="flame-inspect-close" onClick={() => setInspect(false)}>
              Close
            </button>
            <FlameCanvas atmosphere={atmosphere} prediction={prediction} variant="inspect" />
            <p>
              {caption} · {colour}. Changing a slider updates this view live. Press Esc or click outside to close.
            </p>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
