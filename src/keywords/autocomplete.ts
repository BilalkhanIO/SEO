/**
 * Google Autocomplete harvester (playbook §10).
 * Unofficial endpoint — call server-side, throttled, cached.
 */

const ENDPOINT = "https://suggestqueries.google.com/complete/search";

const QUESTION_PREFIXES = [
  "how", "what", "why", "when", "where", "which", "can", "is", "does", "should",
];
const MODIFIER_SUFFIXES = [
  "for", "vs", "without", "with", "near", "best", "free", "cheap", "review",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function suggest(query: string, opts: { gl?: string; hl?: string; ds?: "yt" } = {}): Promise<string[]> {
  const params = new URLSearchParams({ client: "firefox", q: query });
  if (opts.gl) params.set("gl", opts.gl);
  if (opts.hl) params.set("hl", opts.hl);
  if (opts.ds) params.set("ds", opts.ds);
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
  });
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return []; // non-JSON response (proxy/block page) — treat as no suggestions
  }
}

export interface HarvestOptions {
  gl?: string;          // country, e.g. "us", "pk"
  hl?: string;          // language, e.g. "en"
  alphabet?: boolean;   // seed a..z
  questions?: boolean;  // how/what/why... seed
  modifiers?: boolean;  // seed for/vs/best...
  recursive?: boolean;  // feed top suggestions back once
  delayMs?: number;
  onProgress?: (done: number, total: number) => void;
}

export async function harvest(seed: string, opts: HarvestOptions = {}): Promise<string[]> {
  const {
    alphabet = true, questions = true, modifiers = true, recursive = false, delayMs = 1000,
  } = opts;

  const queries: string[] = [seed];
  if (alphabet) for (const c of "abcdefghijklmnopqrstuvwxyz") queries.push(`${seed} ${c}`);
  if (questions) for (const q of QUESTION_PREFIXES) queries.push(`${q} ${seed}`);
  if (modifiers) for (const m of MODIFIER_SUFFIXES) queries.push(`${seed} ${m}`);

  const found = new Set<string>();
  let done = 0;
  for (const q of queries) {
    for (const s of await suggest(q, opts)) {
      const cleaned = s.trim().toLowerCase();
      if (cleaned && cleaned !== seed.toLowerCase()) found.add(cleaned);
    }
    done++;
    opts.onProgress?.(done, queries.length);
    await sleep(delayMs);
  }

  if (recursive) {
    const top = [...found].filter((k) => k.split(" ").length >= 3).slice(0, 10);
    for (const t of top) {
      for (const s of await suggest(t, opts)) found.add(s.trim().toLowerCase());
      await sleep(delayMs);
    }
  }

  return [...found].sort();
}
