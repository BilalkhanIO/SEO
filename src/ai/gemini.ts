import { GoogleGenAI } from "@google/genai";
import { loadConfig } from "../config.js";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const cfg = loadConfig();
    const apiKey = cfg.geminiApiKey;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Generate an AI-powered SEO Content Brief
 */
export async function generateSeoBriefWithGemini(
  keyword: string,
  niche?: string,
  competitorHeadings?: string[]
): Promise<string> {
  const ai = getAiClient();
  const prompt = `You are a world-class SEO content strategist and technical Blogger specialist.
Create a comprehensive, production-ready SEO Content Brief for the target keyword: "${keyword}".
${niche ? `Niche / Industry: ${niche}` : ""}
${
  competitorHeadings && competitorHeadings.length > 0
    ? `Competitor Headings identified on page 1 of Google:\n${competitorHeadings.slice(0, 15).join("\n")}`
    : ""
}

Generate a clear, highly actionable Markdown brief containing:
1. # Target Overview: Keyword, Search Intent (Informational/Commercial/Transactional/Navigational), Target Audience, Target Word Count (recommended 1,500 - 2,500 words).
2. ## SEO Title Options (3 clickable, high-CTR options between 40-60 characters, with primary keyword early).
3. ## Search Description / Meta Description (130-155 characters with call to action).
4. ## Recommended Blogger Custom Permalink (e.g., target-keyword-guide.html).
5. ## Detailed Heading Outline (H1, H2, H3 breakdown with bullet points for what each section must cover).
6. ## People Also Ask (PAA) & FAQ Section (3-5 high-demand questions and concise 40-50 word direct answers suitable for Google featured snippets).
7. ## Semantic NLP Entities & LSI Keywords (15-20 related terms to include naturally).
8. ## Internal & External Linking Guidance for Google Blogger.

Format purely in clean, readable Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return response.text || "Failed to generate brief.";
}

/**
 * Generate high CTR Titles & Search Descriptions
 */
export async function generateSeoMetadataWithGemini(
  keyword: string,
  currentTitle?: string,
  niche?: string
): Promise<{
  titles: string[];
  descriptions: string[];
  permalinks: string[];
}> {
  const ai = getAiClient();
  const prompt = `You are an SEO on-page optimization expert for Google Blogger.
For the keyword: "${keyword}" ${niche ? `in the "${niche}" niche` : ""} ${
    currentTitle ? `(current title: "${currentTitle}")` : ""
  }, generate:
1. Exactly 5 compelling, click-worthy SEO Titles (Strictly 45-58 characters each, keyword placed near beginning, high CTR triggers like numbers, years, benefits, or actionable verbs).
2. Exactly 4 Search Descriptions / Meta Descriptions (Strictly 135-155 characters each, contains primary keyword, value proposition, and actionable CTR hook).
3. Exactly 3 clean Blogger Custom Permalink slugs (lowercase, hyphenated, no stop words, e.g. "seo-keyword-guide").

Respond ONLY in valid JSON with this exact structure:
{
  "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "descriptions": ["Desc 1", "Desc 2", "Desc 3", "Desc 4"],
  "permalinks": ["slug-1", "slug-2", "slug-3"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    return {
      titles: parsed.titles || [],
      descriptions: parsed.descriptions || [],
      permalinks: parsed.permalinks || [],
    };
  } catch (err) {
    return {
      titles: [`${keyword}: Complete Guide [2026]`, `How to Master ${keyword} Fast`],
      descriptions: [`Learn everything you need to know about ${keyword}. Proven tips, step-by-step guidance, and expert best practices for 2026. Read now!`],
      permalinks: [keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")],
    };
  }
}

/**
 * Auto-generate a full SEO blog post in HTML format for Blogger
 */
export async function generateAutoBlogPost(
  keyword: string,
  niche?: string
): Promise<{ title: string; htmlContent: string; tags: string[] }> {
  const ai = getAiClient();
  const prompt = `You are a world-class AI Content Writer and SEO expert specializing in Google Blogger.
Write a comprehensive, engaging, and fully optimized blog post targeting the keyword: "${keyword}".
${niche ? `Niche: ${niche}` : ""}

Requirements:
1. Provide an SEO-optimized H1 title (under 60 characters).
2. Write the full body content using semantic HTML5 tags (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>).
3. The content must be highly readable, authoritative, and structurally sound (intro, body sections, FAQ, conclusion).
4. Do NOT output Markdown. ONLY output clean HTML for the body. Do not include <html>, <head>, or <body> wrappers.
5. Provide 3-5 relevant category tags/labels for the Blogger post.

Respond ONLY in valid JSON format with this exact structure:
{
  "title": "Your SEO H1 Title Here",
  "htmlContent": "<h2>Introduction</h2><p>...</p>",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    throw new Error("Failed to generate blog post content.");
  }
}

export async function expandKeywordsWithGemini(
  seed: string,
  niche?: string
): Promise<
  Array<{
    keyword: string;
    intent: "informational" | "commercial" | "transactional" | "navigational";
    difficulty: "Easy" | "Medium" | "Hard";
    priorityScore: number;
    reason: string;
  }>
> {
  const ai = getAiClient();
  const prompt = `You are a search engine keyword intelligence strategist.
Given the seed topic: "${seed}" ${niche ? `for a website in the "${niche}" niche` : ""}, generate 12 high-potential, long-tail keyword opportunities that are winnable for a Google Blogger site.

Analyze search intent and assign:
- intent: exactly one of "informational", "commercial", "transactional", or "navigational"
- difficulty: "Easy", "Medium", or "Hard"
- priorityScore: 1 to 10 (10 = highest winnability and traffic value)
- reason: 1 short sentence why this is a great target

Respond ONLY in valid JSON format:
[
  {
    "keyword": "how to ...",
    "intent": "informational",
    "difficulty": "Easy",
    "priorityScore": 9,
    "reason": "High demand with low competition from major domains."
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (err) {
    return [];
  }
}
