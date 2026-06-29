import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import {
  extractMatchingSentences,
  hasAcKeywords,
} from "@/lib/reviews/keywords";
import {
  buildSnippetsFromText,
  collectReviewText,
  type ReviewSnippet,
} from "@/lib/reviews/text-sources";

export const acScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("AC comfort score 0-100, 0 = no AC / unbearably hot"),
  hasAc: z.boolean().describe("Whether the place appears to have air conditioning"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the assessment based on available evidence"),
  summary: z
    .string()
    .describe("Brief English summary of AC situation (1-2 sentences)"),
});

export type AcScoreResult = z.infer<typeof acScoreSchema> & {
  mentionCount: number;
  snippets: ReviewSnippet[];
  textSources: string[];
};

const DAILY_LIMIT = 800;
let dailyCount = 0;
let dailyResetDate = new Date().toDateString();

export let geminiDisabled = false;
let geminiDisabledLogged = false;

function isHeuristicMode(): boolean {
  return process.env.SCORING_MODE === "heuristic";
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("quota") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("limit: 0")
  );
}

function disableGemini() {
  geminiDisabled = true;
  if (!geminiDisabledLogged) {
    console.warn("Gemini niet beschikbaar — heuristische scoring");
    geminiDisabledLogged = true;
  }
}

function checkDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailyCount = 0;
    dailyResetDate = today;
  }
  return dailyCount < DAILY_LIMIT;
}

function incrementDailyCount() {
  dailyCount++;
}

export function getRemainingDailyQuota(): number {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - dailyCount);
}

export function isUsingHeuristicScoring(): boolean {
  return isHeuristicMode() || geminiDisabled || !process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

export interface ScorePlaceInput {
  name: string;
  amenity?: string | null;
  osmText?: string | null;
  wikipediaText?: string | null;
  address?: string | null;
}

function buildTextSources(input: ScorePlaceInput): string[] {
  const sources: string[] = [];
  if (input.osmText?.trim()) sources.push("osm");
  if (input.wikipediaText?.trim()) sources.push("wikipedia");
  return sources;
}

function buildSnippets(input: ScorePlaceInput): ReviewSnippet[] {
  const snippets: ReviewSnippet[] = [];
  if (input.osmText?.trim()) {
    snippets.push(...buildSnippetsFromText(input.osmText, "osm"));
  }
  if (input.wikipediaText?.trim()) {
    snippets.push(...buildSnippetsFromText(input.wikipediaText, "wikipedia"));
  }
  return snippets;
}

function buildPrompt(input: ScorePlaceInput): string {
  const combinedText = collectReviewText({
    osmText: input.osmText,
    wikipediaText: input.wikipediaText,
  });

  const parts = [
    `Rate the air conditioning (AC) for: "${input.name}"`,
    input.amenity ? `Type: ${input.amenity}` : null,
    input.address ? `Address: ${input.address}` : null,
    "",
    "Score from 0-100:",
    "- 80-100: excellent AC, comfortably cool",
    "- 60-79: good AC available",
    "- 40-59: limited cooling or unknown",
    "- 20-39: probably little or no AC",
    "- 0-19: no AC, uncomfortably hot in summer",
    "",
  ];

  if (combinedText) {
    parts.push("Available text:", combinedText);
    const matches = extractMatchingSentences(combinedText);
    if (matches.length > 0) {
      parts.push("", "Relevant sentences:", matches.join("\n"));
    }
  } else {
    parts.push(
      "No text available. Base your estimate on the venue type and general knowledge about AC in Dutch buildings."
    );
  }

  parts.push("", "Write the summary field in English.");
  return parts.filter((p) => p != null).join("\n");
}

export async function scorePlaceAc(
  input: ScorePlaceInput
): Promise<AcScoreResult | null> {
  const combinedText = collectReviewText({
    osmText: input.osmText,
    wikipediaText: input.wikipediaText,
  });
  const snippets = buildSnippets(input);
  const textSources = buildTextSources(input);
  const mentionCount = snippets.length;

  if (isHeuristicMode() || geminiDisabled || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return heuristicScore(input, snippets, textSources, mentionCount);
  }

  if (!checkDailyLimit()) {
    console.warn("Gemini daglimiet bereikt, heuristische fallback");
    return heuristicScore(input, snippets, textSources, mentionCount);
  }

  if (!hasAcKeywords(combinedText)) {
    return heuristicScore(input, snippets, textSources, mentionCount);
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-lite"),
      schema: acScoreSchema,
      prompt: buildPrompt(input),
      maxRetries: 0,
    });
    incrementDailyCount();
    return {
      ...object,
      mentionCount,
      snippets,
      textSources,
    };
  } catch (error) {
    if (isQuotaError(error)) {
      disableGemini();
    } else {
      console.error("Gemini scoring mislukt:", error);
    }
    return heuristicScore(input, snippets, textSources, mentionCount);
  }
}

function heuristicScore(
  input: ScorePlaceInput,
  snippets: ReviewSnippet[],
  textSources: string[],
  mentionCount: number
): AcScoreResult {
  const text = collectReviewText({
    osmText: input.osmText,
    wikipediaText: input.wikipediaText,
  });
  const hasKeywords = hasAcKeywords(text);

  const hotAmenities = ["cafe", "restaurant", "bar", "pub", "fast_food"];
  const coolAmenities = ["library", "cinema", "museum", "hotel", "fitness_centre"];

  let score = 45;
  let hasAc = false;
  let confidence = 0.3;

  if (hasKeywords) {
    const lower = text.toLowerCase();
    if (
      lower.includes("geen airco") ||
      lower.includes("zonder airco") ||
      lower.includes("no ac")
    ) {
      score = 15;
      hasAc = false;
      confidence = 0.6;
    } else if (
      lower.includes("airco") ||
      lower.includes("air conditioning") ||
      lower.includes("klimaat")
    ) {
      score = 70;
      hasAc = true;
      confidence = 0.6;
    }
  } else if (input.amenity && coolAmenities.includes(input.amenity)) {
    score = 55;
    hasAc = true;
    confidence = 0.35;
  } else if (input.amenity && hotAmenities.includes(input.amenity)) {
    score = 35;
    confidence = 0.25;
  }

  return {
    score,
    hasAc,
    confidence,
    summary: hasAc
      ? "AC may be present based on available information."
      : "No reliable AC information found; cooling is likely limited.",
    mentionCount,
    snippets,
    textSources,
  };
}
