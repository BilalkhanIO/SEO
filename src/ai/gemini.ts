import { GoogleGenAI } from "@google/genai";
import { loadConfig } from "../config.js";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const cfg = loadConfig();
  const apiKey = cfg.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  if (!aiClient) {
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
 * Robust wrapper with exponential backoff and model fallbacks for 503 / 429 errors
 */
export async function safeGenerateContent(params: {
  preferredModel?: string;
  contents: string;
  config?: any;
}) {
  const ai = getAiClient();
  const modelsToTry = [
    params.preferredModel || "gemini-2.5-flash",
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
  ];

  // Remove duplicates while preserving order
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;
  for (const model of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err?.status || "");
        // If model not found (404), limit reached (429/RESOURCE_EXHAUSTED), or unsupported, skip to next model immediately
        if (
          msg.includes("404") ||
          msg.includes("NOT_FOUND") ||
          msg.includes("limit:") ||
          msg.includes("Quota exceeded") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("not available")
        ) {
          break;
        }
        const isTransient = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
        if (isTransient) {
          // Wait briefly before retry
          await new Promise((res) => setTimeout(res, (attempt + 1) * 1000));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error("Failed to generate content from AI model.");
}

/**
 * Generate an AI-powered SEO Content Brief
 */
export async function generateSeoBriefWithGemini(
  keyword: string,
  niche?: string,
  competitorHeadings?: string[]
): Promise<string> {
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

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
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
  metaDescriptions: string[];
  permallinkSlug: string;
  primaryCategory: string;
}> {
  const prompt = `You are an expert SEO copywriter specialized in Google Blogger click-through-rate (CTR) optimization.
Given the target keyword: "${keyword}"
${currentTitle ? `Current Title: "${currentTitle}"` : ""}
${niche ? `Niche: "${niche}"` : ""}

Generate high-ranking metadata:
1. 5 Click-worthy SEO Titles (under 60 chars, power words, curiosity, or numbers).
2. 3 Search Descriptions (between 130 and 155 characters, with active verbs and primary keyword).
3. An ideal custom Blogger permalink slug (e.g., 'best-seo-tips-blogger').
4. A primary category/label for Blogger.

Respond ONLY in valid JSON format:
{
  "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "metaDescriptions": ["Desc 1", "Desc 2", "Desc 3"],
  "permallinkSlug": "keyword-slug",
  "primaryCategory": "Category"
}`;

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return {
      titles: [`Complete Guide to ${keyword}`, `10 Best Ways to Master ${keyword}`],
      metaDescriptions: [`Learn everything you need to know about ${keyword}. Proven tips, practical steps, and actionable advice.`],
      permallinkSlug: keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      primaryCategory: niche || "General",
    };
  }
}

/**
 * Generate complete full-length blog post HTML ready for Blogger publishing
 */
export async function generateFullBlogPost(
  keyword: string,
  niche?: string,
  internalLinks?: { title: string; url: string }[],
  topAnalyticsTopics?: string[]
): Promise<{ title: string; htmlContent: string; tags: string[]; searchDescription: string }> {
  const prompt = `You are a world-class AI Content Writer, SEO Specialist, and AdSense Monetization Expert.
Write a comprehensive, engaging, highly authoritative, and fully optimized blog post targeting the keyword: "${keyword}".
${niche ? `Niche: ${niche}` : ""}
${topAnalyticsTopics && topAnalyticsTopics.length > 0 ? `Your blog's highest traffic topics are currently: ${topAnalyticsTopics.join(", ")}. If possible, lightly frame or relate the content to these proven high-traffic areas.` : ""}

Content Requirements:
1. Provide a click-worthy SEO Title (H1 equivalent, under 60 characters).
2. Write deep, valuable, high-E-E-A-T body content (Target 1,500+ words).
3. Use clean semantic HTML5 markup: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <table>.
4. Include an interactive Comparison Table or Feature Breakdown table.
5. Include a "Key Takeaways" summary box right after the introduction.
6. Include a rich "Frequently Asked Questions" (FAQ) section with 4-5 high-intent questions and structured answers.
7. Embed a valid Schema.org FAQPage and BlogPosting JSON-LD script at the bottom of the HTML content.
8. Provide 3-5 relevant Blogger category tags/labels.
9. Provide a highly optimized SEO search description (meta description) under 150 characters.
10. EXTERNAL LINKING: Include 1-2 outbound links to high-authority, non-competing external sources (e.g., Wikipedia, official documentation, reputable industry journals) using descriptive anchor text.
${
  internalLinks && internalLinks.length > 0
    ? `\n11. CRITICAL SEO REQUIREMENT: Contextually weave 1 to 3 internal links into the body paragraphs using appropriate anchor text. You may choose from these available related posts:\n${internalLinks
        .slice(0, 15)
        .map((link) => `- Title: "${link.title}" | URL: ${link.url}`)
        .join("\n")}\nFormat the links properly as <a href="URL">anchor text</a>.`
    : ""
}

Respond ONLY in valid JSON format:
{
  "title": "Your SEO Title Here",
  "htmlContent": "<div class=\"blog-post\">...<h2>...</h2>...<script type=\"application/ld+json\">...</script></div>",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "searchDescription": "A short, compelling summary of the post for search engines."
}`;

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
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

/**
 * Automatically audit, expand, and enrich an existing blog post
 */
export async function fixAndEnrichBlogPost(
  currentHtml: string,
  title: string,
  keyword?: string,
  internalLinks?: { title: string; url: string }[]
): Promise<{
  improvedTitle: string;
  improvedHtml: string;
  changelog: string[];
  searchDescription: string;
}> {
  const prompt = `You are an SEO Content Optimizer and AdSense Approval Specialist.
Optimize, rewrite, and significantly expand the following existing Blogger post to fix all content quality and ranking issues.

Current Post Title: "${title}"
${keyword ? `Target Primary Keyword: "${keyword}"` : ""}
Current Post HTML:
${currentHtml.slice(0, 5000)}

Your Task:
1. If the content is thin (< 1,000 words), expand it with in-depth practical advice, steps, examples, and deep domain knowledge (reach 1,500+ words).
2. Add missing semantic <h2> and <h3> subheadings with keyword variations.
3. Add a structured 3-5 item FAQ section with clear, concise answers for Google Featured Snippets.
4. Add Schema.org JSON-LD structured data (FAQPage + BlogPosting) at the bottom.
5. Fix image tags by ensuring all <img> tags have descriptive 'alt="..."' attributes.
6. Add an informative Comparison Table or Step-by-Step checklist.
7. Return clean HTML ready for Google Blogger without markdown wrappers.
8. Provide a highly optimized SEO search description (meta description) under 150 characters based on the expanded content.
9. EXTERNAL LINKING: Include 1-2 outbound links to high-authority, non-competing external sources (e.g., Wikipedia, official documentation, reputable industry journals) using descriptive anchor text.
${
  internalLinks && internalLinks.length > 0
    ? `\n10. CRITICAL SEO REQUIREMENT: Contextually weave 1 to 3 internal links into the expanded body paragraphs using appropriate anchor text. You may choose from these available related posts:\n${internalLinks
        .slice(0, 15)
        .map((link) => `- Title: "${link.title}" | URL: ${link.url}`)
        .join("\n")}\nFormat the links properly as <a href="URL">anchor text</a>.`
    : ""
}

Respond ONLY in valid JSON:
{
  "improvedTitle": "Optimized Click-Worthy Title",
  "improvedHtml": "<h2>Introduction</h2><p>...</p>",
  "changelog": [
    "Expanded word count from X to 1,600+ words",
    "Added 4 semantic H2 and 6 H3 subheadings",
    "Added structured FAQ section with Schema.org JSON-LD",
    "Injected descriptive ALT attributes to all images",
    "Inserted comparative analysis table"
  ],
  "searchDescription": "A short, compelling summary of the updated post for search engines."
}`;

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    // Fallback: append FAQ to original content
    const appendFaq = `<div class="seo-updated-faq"><h2>Frequently Asked Questions</h2><h3>What are the key tips for ${title}?</h3><p>Ensure you follow the recommended steps, maintain consistent updates, and adhere to proven best practices.</p></div>`;
    return {
      improvedTitle: title,
      improvedHtml: currentHtml + "\n<br/>\n" + appendFaq,
      changelog: ["Appended FAQ section to boost semantic ranking density"],
      searchDescription: `Learn about ${title} in this detailed guide. Read the full post for more insights and FAQs.`
    };
  }
}

/**
 * Generate fully compliant legal & navigation policy pages for Google Blogger & AdSense
 */
export async function generatePolicyPage(
  pageType: "privacy" | "terms" | "about" | "contact" | "disclaimer",
  blogName: string,
  blogUrl: string,
  contactEmail?: string
): Promise<{ title: string; htmlContent: string }> {
  const prompt = `You are a compliance attorney and Google AdSense policy specialist.
Generate a comprehensive, legally compliant, and AdSense-ready "${pageType}" page HTML specifically tailored for the website:
- Blog Name: "${blogName}"
- Blog URL: "${blogUrl}"
- Contact Email: "${contactEmail || "contact@" + blogUrl.replace(/https?:\/\//, "").replace(/\/$/, "")}"

Requirements by Page Type:
- "privacy": Full GDPR, CCPA, Google AdSense, DoubleClick DART cookie, Google Analytics, and 3rd-party advertiser disclosures.
- "terms": Standard terms of service, intellectual property notice, disclaimer of warranties, limitation of liability.
- "about": High E-E-A-T author authenticity, mission statement, editorial standards, expertise, and credibility.
- "contact": Contact form placeholder, direct contact details, response time commitment, editorial inquiries.
- "disclaimer": Advertising disclosure, affiliate link disclosure (FTC compliance), professional advice limitation.

Output ONLY valid JSON with clean HTML:
{
  "title": "Page Title (e.g. Privacy Policy)",
  "htmlContent": "<div class=\"legal-page\"><h2>...</h2><p>...</p></div>"
}`;

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    const titles: Record<string, string> = {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      about: "About Us",
      contact: "Contact Us",
      disclaimer: "Disclaimer",
    };
    return {
      title: titles[pageType] || "Policy Page",
      htmlContent: `<div class="policy-page"><h2>${titles[pageType]}</h2><p>Welcome to ${blogName}. Your privacy and trust are of paramount importance to us. For any inquiries, please contact us at ${contactEmail || "our official support channel"}.</p></div>`,
    };
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

  const response = await safeGenerateContent({
    preferredModel: "gemini-3.7-flash",
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

export const generateAutoBlogPost = generateFullBlogPost;
