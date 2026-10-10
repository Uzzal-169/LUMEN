import type { Grounding } from "./grounding";
import { answerOffline } from "./offline";

export type AnswerSource = "live" | "cache" | "offline";

export interface AssistantAnswer {
  text: string;
  citations: string[];
  source: AnswerSource;
  model?: string;
  /** Why the answer fell back to the offline explainer, when it did. */
  note?: string;
}

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

const TIMEOUT_MS = 50_000;

/**
 * Live first, offline second. The server answers from the configured language model
 * (or its cache); if there is no server, no key, or no network, the deterministic
 * explainer answers from the same grounding so the interface never goes quiet.
 */
export async function ask(question: string, grounding: Grounding, history: HistoryTurn[]): Promise<AssistantAnswer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, grounding, history: history.slice(-6) }),
      signal: controller.signal,
    });
    if (response.status === 503) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return offline(question, grounding, body.error === "no-provider" ? "no model configured" : "model unavailable");
    }
    if (!response.ok) return offline(question, grounding, `server returned ${response.status}`);
    const body = (await response.json()) as { answer: string; citations: string[]; source: AnswerSource; model: string };
    return { text: body.answer, citations: body.citations, source: body.source, model: body.model };
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "model timed out" : "no server reachable";
    return offline(question, grounding, reason);
  } finally {
    clearTimeout(timer);
  }
}

function offline(question: string, grounding: Grounding, note: string): AssistantAnswer {
  const { text, citations } = answerOffline(question, grounding);
  return { text, citations, source: "offline", note };
}
