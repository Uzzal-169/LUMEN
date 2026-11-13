import { flexModel, type Ending } from "../model/flex";
import type { Atmosphere } from "../model/flex";
import { stationHelp } from "../model/station";

const ENDING: Record<Ending, string> = {
  Extinction: "extinction",
  Disruption: "disruption",
  Completion: "completion",
};

export function StationPanel({ atmosphere, locked }: { atmosphere: Atmosphere; locked: boolean }) {
  const help = stationHelp(atmosphere, locked);
  const counts = flexModel.metrics.classCounts;
  const nearest = help.nearest;

  return (
    <section className="scope" id="station">
      <h2>Station, next burn</h2>
      <p className="lede">
        PSI-69 flew on the station: extinction {counts.Extinction}, disruption {counts.Disruption}, completion{" "}
        {counts.Completion}. This panel uses that table and the same model. It does not watch the cabin.
      </p>
      {nearest ? (
        <>
          <p className="station-time">
            <span>Recorded burn time</span>
            <strong>{nearest.burnTimeS != null ? `${nearest.burnTimeS} s` : "not recorded"}</strong>
            <span>Nearest test {nearest.id}. That droplet, not a cabin fire.</span>
          </p>
          <p className="place-detail">
            {nearest.fuel}, O₂ {nearest.oxygen.toFixed(2)}, {nearest.pressureAtm.toFixed(2)} atm,{" "}
            {nearest.diameterMm.toFixed(2)} mm, recorded {nearest.ending}.
          </p>
        </>
      ) : null}
      <ul className="tool-notes">
        {locked ? (
          <li>Score withheld. Do not plan the next station burn from this mix.</li>
        ) : help.alreadyExtinction ? (
          <li>This mix is already on the extinction side. The nearest recorded burn is the check.</li>
        ) : (
          <>
            <li>
              {help.oxygen
                ? `Drop oxygen to ${help.oxygen.value.toFixed(2)} and move that share into nitrogen. The same model then says ${ENDING[help.oxygen.top]}.`
                : "No in-range oxygen drop flips this mix to extinction."}
            </li>
            <li>
              {help.helium
                ? `Raise helium to ${help.helium.value.toFixed(2)} and take that share from nitrogen. The same model then says ${ENDING[help.helium.top]}.`
                : "No in-range helium rise flips this mix to extinction."}
            </li>
          </>
        )}
      </ul>
    </section>
  );
}
