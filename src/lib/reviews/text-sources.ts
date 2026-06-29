import { hasAcKeywords, extractMatchingSentences } from "./keywords";

export interface ReviewSnippet {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
}

export function extractOsmTagText(tags: Record<string, string>): string {
  return [tags.description, tags.note, tags.fixme, tags.comment]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function collectReviewText(parts: {
  osmText?: string | null;
  wikipediaText?: string | null;
}): string {
  return [parts.osmText, parts.wikipediaText].filter(Boolean).join("\n\n").trim();
}

export function shouldCallGemini(text: string): boolean {
  return hasAcKeywords(text);
}

export function buildSnippetsFromText(
  text: string,
  source: string
): ReviewSnippet[] {
  return extractMatchingSentences(text).map((sentence) => ({
    text: sentence,
    sentiment: inferSentiment(sentence),
    source,
  }));
}

function inferSentiment(sentence: string): ReviewSnippet["sentiment"] {
  const lower = sentence.toLowerCase();
  if (
    lower.includes("geen airco") ||
    lower.includes("zonder airco") ||
    lower.includes("no ac") ||
    lower.includes("te warm") ||
    lower.includes("too hot")
  ) {
    return "negative";
  }
  if (
    lower.includes("airco") ||
    lower.includes("air conditioning") ||
    lower.includes("klimaat") ||
    lower.includes("gekoeld") ||
    lower.includes("cooling")
  ) {
    return "positive";
  }
  return "neutral";
}

export function buildGoogleMapsSearchUrl(
  name: string,
  city?: string | null
): string {
  const query = encodeURIComponent(
    [name, city, "Nederland"].filter(Boolean).join(" ")
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
