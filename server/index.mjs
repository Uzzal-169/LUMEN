// Grounded assistant API. Node only, no dependencies.
//
//   node server/index.mjs            listens on 127.0.0.1:8787 (PORT to change)
//
// Reads .env from the repository root. Provider settings, see .env.example:
//   LLM_PROVIDER = openai-compatible | azure | none
// The browser never sees the key: Vite proxies /api to this process.
//
// Contract with the frontend:
//   POST /api/chat { question, grounding, history } ->
//        200 { answer, citations, source: "live" | "cache", model }
//        503 { error: "no-provider" | "upstream" }      (frontend falls back offline)
//   GET  /api/health -> { configured, provider, model }

import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
loadEnv(path.join(root, ".env"));

const PORT = Number(process.env.PORT ?? 8787);
const CACHE_DIR = path.join(root, "cache", "chat");
const FIXTURE_FILE = path.join(root, "demo_fixtures", "chat.json");
const OFFLINE = process.env.OFFLINE === "1";
const provider = configureProvider();

const SYSTEM_PROMPT = `You are the explanation layer of LUMEN, a fire-safety screening tool built for the NASA Space Apps challenge "Flame in Freefall".
A deterministic gradient-boosted model, trained on NASA's PSI-69 Flame Extinguishment Experiment (FLEX) table from the Physical Sciences Informatics repository, has already produced a prediction. You explain it. You do not compute.

Rules, in priority order:
1. Use only the JSON grounding in the user message. It holds the chamber settings, the prediction and class probabilities, the nearest recorded burns with their real endings, model evaluations at nearby chambers ("counterfactuals"), out-of-range flags, held-out metrics and permutation importance.
2. Quote probabilities, counts and ranges exactly as given. Never invent, round differently, or extrapolate a number that is not in the grounding.
3. Cite recorded burns by their row id (for example 20CAL10) whenever you refer to them.
4. If "outOfRange" is non-empty, say clearly that the model is extrapolating and the prediction is unreliable.
5. If the question cannot be answered from the grounding, say so in one sentence and point to what the grounding does show. Do not answer from general knowledge about combustion unless you label it as background and keep it to one sentence.
6. Be concise: at most 120 words, no bullet lists, no markdown.
7. Match the user's language. If the question is in Bangla (Bengali script) or Banglish (Romanized Bengali: keno, ki hobe, koto viswas, tahole), write the whole answer in fluent Bengali. Keep row ids, percentages, units (atm, mm, O₂) and the English class names Extinction, Disruption and Completion exactly as they appear in the grounding. Otherwise answer in English.`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      return json(res, 200, { configured: provider.configured && !OFFLINE, provider: provider.name, model: provider.model });
    }
    if (req.method === "POST" && req.url === "/api/chat") {
      const body = JSON.parse(await readBody(req));
      return await chat(body, res);
    }
    json(res, 404, { error: "not-found" });
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "server", detail: String(error?.message ?? error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`assistant api on http://127.0.0.1:${PORT}  provider=${provider.name} model=${provider.model ?? "-"}${OFFLINE ? " OFFLINE=1" : ""}`);
});

async function chat({ question, grounding, history = [] }, res) {
  if (typeof question !== "string" || !grounding) return json(res, 400, { error: "bad-request" });

  const key = cacheKey(question, grounding);
  const cached = readCache(key) ?? readFixture(key);
  if (cached) return json(res, 200, { ...cached, source: "cache" });

  if (OFFLINE || !provider.configured) return json(res, 503, { error: "no-provider" });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter((turn) => turn && (turn.role === "user" || turn.role === "assistant")).slice(-6),
    {
      role: "user",
      content: `Reply language: ${banglaQuestion(question) ? "Bengali" : "English"}.\nGrounding JSON:\n${JSON.stringify(grounding)}\n\nQuestion: ${question}`,
    },
  ];

  try {
    const answer = await provider.complete(messages);
    const result = { answer, citations: extractCitations(answer, grounding), model: provider.model };
    writeCache(key, result);
    json(res, 200, { ...result, source: "live" });
  } catch (error) {
    console.error("upstream", error?.message ?? error);
    json(res, 503, { error: "upstream", detail: String(error?.message ?? error) });
  }
}

// ---- providers -------------------------------------------------------------

function configureProvider() {
  const name = (process.env.LLM_PROVIDER ?? (hasAzureCreds() ? "azure" : "none")).toLowerCase();

  if (name === "azure") {
    // Accept both LUMEN names and the DIU Ai Assistant names (OPENAI_ENDPOINT / OPENAI_KEY / DEPLOYMENT_NAME).
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || process.env.OPENAI_ENDPOINT || "").replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.DEPLOYMENT_NAME;
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2025-04-01-preview";
    const configured = Boolean(endpoint && deployment && apiKey);
    return {
      name,
      model: deployment,
      configured,
      complete: (messages) =>
        chatCompletion(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, { "api-key": apiKey }, {
          messages,
          ...generationOptions(deployment),
        }),
    };
  }

  if (name === "openai-compatible") {
    const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const configured = Boolean(apiKey && model);
    return {
      name,
      model,
      configured,
      complete: (messages) =>
        chatCompletion(`${baseUrl}/chat/completions`, { authorization: `Bearer ${apiKey}`, "api-key": apiKey }, {
          model,
          messages,
          ...generationOptions(model),
        }),
    };
  }

  return { name: "none", model: undefined, configured: false, complete: async () => { throw new Error("no provider"); } };
}

/**
 * GPT-5-family and o-series models are reasoning models: they reject a custom temperature,
 * spend part of the completion budget on hidden reasoning, and take `max_completion_tokens`.
 * Older chat models take `temperature` and `max_tokens`.
 */
function hasAzureCreds() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.DEPLOYMENT_NAME;
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_KEY;
  return Boolean(endpoint && deployment && apiKey);
}

function generationOptions(model = "") {
  const reasoning = /^(gpt-5|o\d)/i.test(model);
  if (reasoning) {
    const effort = process.env.LLM_REASONING_EFFORT ?? "low";
    return { max_completion_tokens: 1500, ...(effort === "none" ? {} : { reasoning_effort: effort }) };
  }
  return { temperature: 0.2, max_tokens: 350 };
}

async function chatCompletion(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`empty completion (finish_reason=${choice?.finish_reason ?? "unknown"})`);
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// ---- cache and fixtures -----------------------------------------------------

function cacheKey(question, grounding) {
  const normalised = {
    q: question.trim().toLowerCase().replace(/\s+/g, " "),
    chamber: grounding.chamber,
    top: grounding.prediction?.top,
    neighbors: (grounding.neighbors ?? []).map((n) => n.id),
  };
  return createHash("sha1").update(JSON.stringify(normalised)).digest("hex");
}

function readCache(key) {
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(key, result) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(result, null, 2));
}

/** Committed answers for the rehearsed demo questions, keyed like the cache. */
function readFixture(key) {
  if (!fs.existsSync(FIXTURE_FILE)) return null;
  try {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8"));
    return fixtures[key] ?? null;
  } catch {
    return null;
  }
}

function banglaQuestion(question) {
  if (/[\u0980-\u09FF]/.test(question)) return true;
  return /\b(keno|kano|ki|koto|kemon|hobe|hote|korte|kortese|korbe|parbe|paro|pari|kora|jabe|jabo|tahole|taile|eita|eta|oita|amake|amra|amar|tumi|apni|bolo|bolun|bujhi|bujhte|bujlam|viswas|bishwas|biswas|ashe|ache|naki|bangla|banglay|banglish|uttor|uttar|dhoro|dhorun|komale|barale|kache|kachakachi|onek|ektu)\b/i.test(
    question,
  );
}

function extractCitations(answer, grounding) {
  const ids = (grounding.neighbors ?? []).map((n) => n.id);
  return ids.filter((id) => answer.includes(id));
}

// ---- helpers ----------------------------------------------------------------

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trim().startsWith("#")) continue;
    const [, name, raw] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = raw.replace(/^(['"])(.*)\1$/, "$2");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 512 * 1024) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}
