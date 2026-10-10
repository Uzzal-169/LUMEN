import { describe, expect, it } from "vitest";
import { isBanglaQuestion, replyLanguage } from "./language";

describe("question language", () => {
  it("treats English as English", () => {
    expect(replyLanguage("Why does the model predict this ending?")).toBe("en");
    expect(isBanglaQuestion("What happens if oxygen drops by 2%?")).toBe(false);
  });

  it("treats Bengali script as Bangla", () => {
    expect(replyLanguage("কেন এই ending?")).toBe("bn");
  });

  it("treats Banglish as Bangla", () => {
    expect(isBanglaQuestion("Keno ei ending predict kortese?")).toBe(true);
    expect(isBanglaQuestion("Oxygen komale ki hobe?")).toBe(true);
    expect(isBanglaQuestion("Koto viswas kora jabe?")).toBe(true);
  });
});
