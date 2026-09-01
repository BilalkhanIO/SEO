export interface Blog {
  id: number;
  name: string;
  url: string;
  blogger_blog_id: string | null;
  gsc_property: string | null;
  ga4_property: string | null;
  adsense_account: string | null;
  is_custom_domain: number;
  niche: string | null;
  created_at: string;
}

export interface Keyword {
  id: number;
  blog_id: number;
  keyword: string;
  source: string;
  intent: string | null;
  status: "idea" | "scored" | "briefed" | "assigned" | "archived";
  score_relevance: number | null;
  score_intent: number | null;
  score_winnable: number | null;
  score_traffic: number | null;
  score_value: number | null;
  score_total: number | null;
  notes: string | null;
  serp_json: string | null;
  created_at: string;
}

export interface Post {
  id: number;
  blog_id: number;
  keyword_id: number | null;
  title: string;
  url: string | null;
  blogger_post_id: string | null;
  permalink: string | null;
  stage: "idea" | "researched" | "briefed" | "drafted" | "optimized" | "published" | "indexed" | "tracking" | "refresh";
  brief_md: string | null;
  published_at: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  keyword?: string;
  keyword_score?: number;
  blog_name?: string;
}

export interface ValidationIssue {
  rule: string;
  level: "error" | "warn";
  message: string;
}

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  headings?: string[];
  wordCount?: number;
}

export interface SerpAnalysis {
  keyword: string;
  results: SerpResult[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  fetchedAt: string;
}

export interface Alert {
  id: number;
  blog_id: number;
  post_url: string;
  type: string;
  message: string;
  data_json: string;
  status: "open" | "done" | "dismissed";
  created_at: string;
  blog_name?: string;
}

// Note: GET /api/outreach and /api/outreach/due return partial column
// projections (see src/outreach/outreach.ts listProspects/dueToday) that
// vary by endpoint — fields below beyond id/site_url/status/opportunity
// may be absent from a given response, not just null.
export interface Prospect {
  id: number;
  blog_id?: number;
  site_name: string | null;
  site_url: string;
  niche?: string | null;
  authority: number | null;
  contact_name?: string | null;
  contact_email: string | null;
  email_verified?: number;
  opportunity: string;
  status: string;
  last_contact_at?: string | null;
  next_action_at: string | null;
  published_url: string | null;
  link_rel: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface PageSpeedData {
  url: string;
  strategy: string;
  performance: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  fieldData: boolean;
  topOpportunities: string[];
}
