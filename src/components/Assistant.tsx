import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ask, type AssistantAnswer, type HistoryTurn } from "../assistant/client";
import { buildGrounding } from "../assistant/grounding";
import type { Atmosphere, Prediction } from "../model/flex";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  source?: AssistantAnswer["source"];
  model?: string;
  note?: string;
}

const SUGGESTIONS = [
  "Why does the model predict this ending?",
  "What happens if oxygen drops by 2%?",
  "Which recorded experiments are closest?",
  "How much should I trust this?",
];

const SOURCE_LABEL: Record<NonNullable<Message["source"]>, string> = {
  live: "language model",
  cache: "cached answer",
  offline: "computed from the table",
};

export function Assistant({ atmosphere, prediction }: { atmosphere: Atmosphere; prediction: Prediction }) {
  const grounding = useMemo(() => buildGrounding(atmosphere, prediction), [atmosphere, prediction]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    const history: HistoryTurn[] = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((list) => [...list, { id: nextId.current++, role: "user", text: trimmed }]);
    setDraft("");
    setBusy(true);
    try {
      const answer = await ask(trimmed, grounding, history);
      setMessages((list) => [
        ...list,
        {
          id: nextId.current++,
          role: "assistant",
          text: answer.text,
          citations: answer.citations,
          source: answer.source,
          model: answer.model,
          note: answer.note,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  const neighborById = new Map(grounding.neighbors.map((n) => [n.id, n]));

  return (
    <section className="assistant" aria-label="Grounded assistant">
      <div className="assistant-head">
        <h2>Ask about this prediction</h2>
        <p>
          Answers are limited to the model output, the {grounding.neighbors.length} nearest PSI-69 burns, and the
          held-out score. The language model explains; it never computes a number.
        </p>
      </div>

      <ol className="assistant-log" ref={logRef} aria-live="polite">
        {messages.length === 0 ? (
          <li className="assistant-empty">
            Current grounding: {grounding.prediction.top.toLowerCase()} at{" "}
            {Math.round(grounding.prediction.probabilities[grounding.prediction.top] * 100)}%, nearest test{" "}
            {grounding.neighbors[0]?.id}
            {grounding.outOfRange.length > 0 ? ", chamber outside the recorded range" : ""}.
          </li>
        ) : null}
        {messages.map((message) => (
          <li key={message.id} className={`msg msg-${message.role}`}>
            <p>{message.text}</p>
            {message.role === "assistant" ? (
              <footer>
                {message.source ? (
                  <span className={`source source-${message.source}`} title={message.note}>
                    {SOURCE_LABEL[message.source]}
                    {message.model ? ` · ${message.model}` : ""}
                  </span>
                ) : null}
                {message.citations?.map((id) => {
                  const n = neighborById.get(id);
                  const title = n
                    ? `${n.fuel} · O₂ ${n.oxygen.toFixed(2)} · ${n.pressureAtm.toFixed(2)} atm · ${n.diameterMm.toFixed(2)} mm · ${n.ending}`
                    : "PSI-69 row";
                  return (
                    <span key={id} className="cite" title={title}>
                      {id}
                    </span>
                  );
                })}
              </footer>
            ) : null}
          </li>
        ))}
        {busy ? (
          <li className="msg msg-assistant pending">
            <p>Reading the nearest burns…</p>
          </li>
        ) : null}
      </ol>

      <div className="assistant-suggest" role="group" aria-label="Suggested questions">
        {SUGGESTIONS.map((text) => (
          <button key={text} type="button" onClick={() => void send(text)} disabled={busy}>
            {text}
          </button>
        ))}
      </div>

      <form className="assistant-compose" onSubmit={onSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Your Assistant"
          aria-label="Question"
          disabled={busy}
        />
        <button type="submit" disabled={busy || draft.trim() === ""}>
          Ask
        </button>
      </form>

      <details className="assistant-grounding">
        <summary>What the assistant was shown</summary>
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>Fuel</th>
              <th>O₂</th>
              <th>atm</th>
              <th>mm</th>
              <th>Recorded ending</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>
            {grounding.neighbors.map((n) => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.fuel}</td>
                <td>{n.oxygen.toFixed(2)}</td>
                <td>{n.pressureAtm.toFixed(2)}</td>
                <td>{n.diameterMm.toFixed(2)}</td>
                <td>{n.ending}</td>
                <td>{n.distance.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Plus the current probabilities, {grounding.counterfactuals.length} model evaluations at nearby chambers, the
          held-out metrics, and the permutation importance. Nothing else.
        </p>
      </details>
    </section>
  );
}
