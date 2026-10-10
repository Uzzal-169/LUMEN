export type ReplyLanguage = "bn" | "en";

const BANGLISH =
  /\b(keno|kano|ki|koto|kemon|kemon|hobe|hote|korte|kortese|korbe|parbe|paro|pari|kora|jabe|jabo|tahole|taile|eita|eta|oita|amake|amra|amar|tumi|apni|bolo|bolun|bujhi|bujhte|bujlam|viswas|bishwas|biswas|ashe|ache|naki|na ki|bangla|banglay|banglish|uttor|uttar|dhoro|dhorun|komale|barale|kache|kachakachi|onek|ektu|please bangla)\b/i;

/** True when the question is Bengali script or Romanized Banglish. */
export function isBanglaQuestion(question: string): boolean {
  if (/[\u0980-\u09FF]/.test(question)) return true;
  return BANGLISH.test(question);
}

export function replyLanguage(question: string): ReplyLanguage {
  return isBanglaQuestion(question) ? "bn" : "en";
}
