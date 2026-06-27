export const AC_KEYWORDS_NL = [
  "airco",
  "airconditioning",
  "air conditioning",
  "klimaatbeheersing",
  "koeling",
  "gekoeld",
  "airconditioner",
  "airconditioning aanwezig",
  "met airco",
  "zonder airco",
  "geen airco",
  "te warm",
  "te koud",
  "ventilatie",
  "klimaatregeling",
] as const;

export const AC_KEYWORDS_EN = [
  "air conditioning",
  "aircon",
  "a/c",
  "ac unit",
  "cooling",
  "climate control",
  "too hot",
  "too cold",
  "no ac",
  "with ac",
  "without ac",
] as const;

export const AC_KEYWORDS = [...AC_KEYWORDS_NL, ...AC_KEYWORDS_EN] as const;

const keywordPattern = new RegExp(
  AC_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

export function hasAcKeywords(text: string): boolean {
  return keywordPattern.test(text);
}

export function extractMatchingSentences(text: string): string[] {
  if (!text.trim()) return [];

  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences.filter((s) => keywordPattern.test(s));
}

export function keywordMatches(text: string): string[] {
  const matches: string[] = [];
  const lower = text.toLowerCase();
  for (const kw of AC_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      matches.push(kw);
    }
  }
  return matches;
}
