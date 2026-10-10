import type { Ending } from "../model/flex";
import type { Grounding } from "./grounding";
import { replyLanguage, type ReplyLanguage } from "./language";

/**
 * Deterministic answers composed from the grounding alone. This is what the assistant
 * says when no language model is configured or the network is down, so the demo never
 * depends on a server. Every number here comes from the model or the PSI-69 table.
 */
export interface OfflineAnswer {
  text: string;
  citations: string[];
}

const ENDING_PHRASE: Record<ReplyLanguage, Record<Ending, string>> = {
  en: {
    Extinction: "the visible flame goes out",
    Disruption: "the droplet breaks apart before a clean ending",
    Completion: "the burn runs through to completion",
  },
  bn: {
    Extinction: "দেখা যায় এমন শিখা নিভে যায়",
    Disruption: "ড্রপলেট ভেঙে যায়, পরিষ্কার শেষ হয় না",
    Completion: "পোড়া শেষ পর্যন্ত চলে",
  },
};

export function answerOffline(question: string, g: Grounding): OfflineAnswer {
  const lang = replyLanguage(question);
  const q = question.toLowerCase();
  const ids = g.neighbors.map((n) => n.id);

  if (intent(q, "neighbors")) return { text: neighborsText(g, lang), citations: ids };
  if (intent(q, "trust")) return { text: metricsText(g, lang), citations: [] };
  if (intent(q, "oxygen")) return { text: sensitivityText(g, "oxygen", lang), citations: ids.slice(0, 3) };
  if (intent(q, "pressure")) return { text: sensitivityText(g, "pressure", lang), citations: ids.slice(0, 3) };
  if (intent(q, "droplet")) return { text: sensitivityText(g, "droplet", lang), citations: ids.slice(0, 3) };
  if (intent(q, "fuel")) return { text: sensitivityText(g, "fuel", lang), citations: ids.slice(0, 3) };
  if (intent(q, "range")) return { text: rangeText(g, lang), citations: [] };
  if (intent(q, "importance")) return { text: importanceText(g, lang), citations: [] };
  return { text: whyText(g, lang), citations: ids.slice(0, 3) };
}

function intent(
  q: string,
  kind: "neighbors" | "trust" | "oxygen" | "pressure" | "droplet" | "fuel" | "range" | "importance",
): boolean {
  const patterns: Record<typeof kind, RegExp> = {
    neighbors:
      /\b(closest|nearest|similar|neighbou?r|experiment|which test|which row|record|kachakachi|kache|kon test|kon row)\b|কাছাকাছি|কোন পরীক্ষা|কোন টেস্ট|কোন রো/,
    trust:
      /\b(accura|trust|confiden|reliab|score|how good|valid|wrong|error|viswas|bishwas|biswas|koto bishwas)\b|বিশ্বাস|নির্ভুল|সঠিক|ভুল/,
    oxygen: /\b(oxygen|o2|o₂|air|oksijen|oxygen)\b|অক্সিজেন/,
    pressure: /\b(pressure|atm|mmhg|presar)\b|চাপ|প্রেসার/,
    droplet: /\b(droplet|diameter|size|bigger|smaller|larger|byas)\b|ড্রপলেট|ব্যাস|আকার/,
    fuel: /\b(heptane|methanol|fuel|jalani)\b|জ্বালানি|হেপ্টেন|মেথানল/,
    range: /\b(range|outside|extrapolat|cover|trained on|baire)\b|রেঞ্জ|বাইরে|প্রশিক্ষণ/,
    importance: /\b(important|matters|feature|uses|depend|guruttopurno)\b|গুরুত্বপূর্ণ|কোন ফিচার/,
  };
  return patterns[kind].test(q);
}

export function whyText(g: Grounding, lang: ReplyLanguage = "en"): string {
  const { top, probabilities } = g.prediction;
  const parts =
    lang === "bn"
      ? [`মডেল ${ending(top, lang)} বলেছে (${pct(probabilities[top])}): ${ENDING_PHRASE.bn[top]}.`]
      : [`The model predicts ${top.toLowerCase()} (${pct(probabilities[top])}): ${ENDING_PHRASE.en[top]}.`];
  const agree = g.neighbors.filter((n) => n.ending === top);
  if (agree.length > 0) {
    parts.push(
      lang === "bn"
        ? `এই চেম্বারের কাছাকাছি ${g.neighbors.length}টা রেকর্ডেড বার্নের মধ্যে ${agree.length}টা একইভাবে শেষ হয়েছে, যেমন ${listIds(agree.map((n) => n.id), lang)}.`
        : `Of the ${g.neighbors.length} recorded burns closest to this chamber, ${agree.length} ended the same way, including ${listIds(agree.map((n) => n.id), lang)}.`,
    );
  } else {
    parts.push(
      lang === "bn"
        ? `কাছাকাছি ${g.neighbors.length}টা বার্নের কোনোটাই এভাবে শেষ হয়নি; সেগুলো ${describeCounts(g.neighborEndings, lang)} এ শেষ, তাই এই প্রেডিকশন সাবধানে নাও.`
        : `None of the ${g.neighbors.length} closest recorded burns ended this way; they ended in ${describeCounts(g.neighborEndings, lang)}, so treat this prediction with caution.`,
    );
  }
  const n0 = g.neighbors[0];
  if (n0) {
    parts.push(
      lang === "bn"
        ? `সবচেয়ে কাছের টেস্ট ${n0.id}: ${n0.fuel.toLowerCase()}, O₂ ${n0.oxygen.toFixed(2)}, ${n0.pressureAtm.toFixed(2)} atm, ${n0.diameterMm.toFixed(2)} mm, শেষ হয়েছিল ${ending(n0.ending, lang)}${n0.burnTimeS ? ` ${n0.burnTimeS} সেকেন্ডে` : ""}.`
        : `The nearest test is ${n0.id}: ${n0.fuel.toLowerCase()}, O₂ ${n0.oxygen.toFixed(2)}, ${n0.pressureAtm.toFixed(2)} atm, ${n0.diameterMm.toFixed(2)} mm, which ended in ${n0.ending.toLowerCase()}${n0.burnTimeS ? ` after ${n0.burnTimeS} s` : ""}.`,
    );
  }
  const flip = g.counterfactuals.find((c) => c.top !== top);
  if (flip) {
    parts.push(
      lang === "bn"
        ? `${flip.label}-এ প্রেডিকশন বদলে ${ending(flip.top, lang)} হয় (${pct(flip.probabilities[flip.top])}).`
        : `The prediction changes to ${flip.top.toLowerCase()} with ${flip.label} (${pct(flip.probabilities[flip.top])}).`,
    );
  }
  if (g.outOfRange.length > 0) parts.push(rangeText(g, lang));
  return parts.join(" ");
}

function neighborsText(g: Grounding, lang: ReplyLanguage): string {
  const lines = g.neighbors.map(
    (n) =>
      `${n.id} (${n.fuel.toLowerCase()}, O₂ ${n.oxygen.toFixed(2)}, ${n.pressureAtm.toFixed(2)} atm, ${n.diameterMm.toFixed(2)} mm) ${lang === "bn" ? `${ending(n.ending, lang)} এ শেষ` : `ended in ${n.ending.toLowerCase()}`}`,
  );
  return lang === "bn"
    ? `এই চেম্বারের কাছাকাছি ${g.neighbors.length}টা PSI-69 বার্ন: ${lines.join("; ")}. মিলে শেষ হয়েছে ${describeCounts(g.neighborEndings, lang)}.`
    : `The ${g.neighbors.length} recorded PSI-69 burns closest to this chamber: ${lines.join("; ")}. Together they ended in ${describeCounts(g.neighborEndings, lang)}.`;
}

function metricsText(g: Grounding, lang: ReplyLanguage): string {
  const m = g.metrics;
  if (lang === "bn") {
    return (
      `${g.dataset.rowsUsed} রো-তে পাঁচ-ভাঁজ accuracy ${pct(m.accuracy)}; সবসময় ${ending(m.majorityClass as Ending, lang)} ধরলে ${pct(m.majorityAccuracy)} হয়. ` +
      `Recall: extinction ${pct(m.recall.Extinction)}, disruption ${pct(m.recall.Disruption)}, completion ${pct(m.recall.Completion)} — completion-এ মাত্র ${m.classCounts.Completion}টা রো. ` +
      `এখনকার প্রেডিকশনের সম্ভাবনা ${pct(g.prediction.probabilities[g.prediction.top])}; ৫০%-এর কাছাকাছি হলে অনিশ্চিত ধরো.`
    );
  }
  return (
    `Five-fold cross-validated accuracy is ${pct(m.accuracy)} on ${g.dataset.rowsUsed} rows; always guessing ${m.majorityClass.toLowerCase()} would score ${pct(m.majorityAccuracy)}. ` +
    `Recall is ${pct(m.recall.Extinction)} for extinction, ${pct(m.recall.Disruption)} for disruption and ${pct(m.recall.Completion)} for completion, which has only ${m.classCounts.Completion} rows. ` +
    `The current prediction carries ${pct(g.prediction.probabilities[g.prediction.top])} probability; treat anything near 50% as uncertain.`
  );
}

function sensitivityText(g: Grounding, which: "oxygen" | "pressure" | "droplet" | "fuel", lang: ReplyLanguage): string {
  const prefix = which === "fuel" ? "fuel" : which;
  const related = g.counterfactuals.filter((c) => c.label.startsWith(prefix));
  const { top } = g.prediction;
  const describe = related.map((c) =>
    lang === "bn"
      ? `${c.label} → ${ending(c.top, lang)} (${pct(c.probabilities[c.top])})`
      : `${c.label} → ${c.top.toLowerCase()} (${pct(c.probabilities[c.top])})`,
  );
  const changes = related.some((c) => c.top !== top);
  const featureBn = { oxygen: "অক্সিজেন", pressure: "প্রেসার", droplet: "ড্রপলেট", fuel: "জ্বালানি" }[which];
  const head =
    lang === "bn"
      ? `এখন মডেল ${ending(top, lang)} বলেছে (${pct(g.prediction.probabilities[top])}). ${featureBn} বদলে একই মডেল চালালে: ${describe.join("; ")}.`
      : `At the current chamber the model predicts ${top.toLowerCase()} (${pct(g.prediction.probabilities[top])}). Evaluating the same model with ${which} changed: ${describe.join("; ")}.`;
  const tail = changes
    ? lang === "bn"
      ? ` অর্থাৎ এখানে ${featureBn} ডিসিশন বাউন্ডারির কাছে.`
      : ` So ${which} is near a decision boundary here.`
    : lang === "bn"
      ? ` এই ধাপে ending বদলায় না, তাই এখানে শুধু ${featureBn}ই সিদ্ধান্ত দিচ্ছে না.`
      : ` The ending does not change over that step, so ${which} alone is not the deciding factor at this point.`;
  const imp = g.importance.find((i) =>
    i.feature.startsWith(which === "droplet" ? "diameter" : which === "fuel" ? "fuel" : which),
  );
  const impText = imp
    ? lang === "bn"
      ? ` টেবিলে ${featureBn} শাফল করলে accuracy ${imp.accuracyDrop.toFixed(3)} কমে.`
      : ` Shuffling ${which} in the training table drops accuracy by ${imp.accuracyDrop.toFixed(3)}.`
    : "";
  return head + tail + impText;
}

function rangeText(g: Grounding, lang: ReplyLanguage): string {
  if (g.outOfRange.length === 0) {
    return lang === "bn"
      ? "চাওয়া প্রতিটা মান PSI-69 টেবিলের রেঞ্জের ভেতরে, তাই মডেল এক্সট্রাপোলেট করছে না."
      : "Every requested value sits inside the range the PSI-69 table recorded, so the model is interpolating rather than extrapolating.";
  }
  const items = g.outOfRange.map(
    (r) => `${label(r.feature, lang)} = ${r.value} (${lang === "bn" ? "টেবিল" : "table covers"} ${r.min} ${lang === "bn" ? "থেকে" : "to"} ${r.max})`,
  );
  return lang === "bn"
    ? `সাবধান: ${items.join("; ")}. মডেল এমন বার্ন দেখেনি, এটা এক্সট্রাপোলেশন.`
    : `Caution: ${items.join("; ")}. The model has never seen such a burn and this prediction is an extrapolation.`;
}

function importanceText(g: Grounding, lang: ReplyLanguage): string {
  const top4 = g.importance.slice(0, 4).map((i) => `${label(i.feature, lang)} (${i.accuracyDrop.toFixed(3)})`);
  return lang === "bn"
    ? `Permutation importance, কলাম শাফল করলে যে accuracy হারায়: ${top4.join(", ")}. অক্সিজেন সবার আগে, তারপর ড্রপলেট ব্যাস, প্রেসার আর জ্বালানি — ড্রপলেট-কম্বাশন ফিজিক্সের সাথে মিলে.`
    : `Permutation importance, measured as the accuracy lost when a column is shuffled: ${top4.join(", ")}. Oxygen leads, then droplet diameter, pressure and fuel, which matches droplet-combustion physics.`;
}

function describeCounts(counts: Record<Ending, number>, lang: ReplyLanguage): string {
  return (Object.entries(counts) as Array<[Ending, number]>)
    .filter(([, n]) => n > 0)
    .map(([name, n]) => (lang === "bn" ? `${ending(name, lang)} ×${n}` : `${name.toLowerCase()} ×${n}`))
    .join(", ");
}

function listIds(ids: string[], lang: ReplyLanguage): string {
  const and = lang === "bn" ? " এবং " : " and ";
  if (ids.length <= 2) return ids.join(and);
  return `${ids.slice(0, -1).join(", ")}${and}${ids[ids.length - 1]}`;
}

function ending(name: Ending, lang: ReplyLanguage): string {
  return lang === "bn" ? name.toLowerCase() : name.toLowerCase();
}

function label(feature: string, lang: ReplyLanguage = "en"): string {
  if (lang === "bn") {
    switch (feature) {
      case "oxygen":
        return "অক্সিজেন";
      case "nitrogen":
        return "নাইট্রোজেন";
      case "carbonMonoxide":
        return "CO";
      case "helium":
        return "হিলিয়াম";
      case "pressureAtm":
        return "প্রেসার (atm)";
      case "diameterMm":
        return "ড্রপলেট ব্যাস (mm)";
      case "fuelHeptane":
        return "জ্বালানি";
      default:
        return feature;
    }
  }
  switch (feature) {
    case "oxygen":
      return "oxygen";
    case "nitrogen":
      return "nitrogen";
    case "carbonMonoxide":
      return "CO";
    case "helium":
      return "helium";
    case "pressureAtm":
      return "pressure (atm)";
    case "diameterMm":
      return "droplet diameter (mm)";
    case "fuelHeptane":
      return "fuel";
    default:
      return feature;
  }
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
