/*
 * Resolves the best available OpenAI model at runtime so the app always uses
 * the latest model without needing code changes.
 *
 * Selection priority (highest to lowest):
 *  1. Latest gpt-4o variant with a date suffix (e.g. gpt-4o-2025-xx-xx)
 *  2. gpt-4o (base)
 *  3. Latest gpt-4-turbo variant
 *  4. gpt-4-turbo (base)
 *  5. gpt-4 (base)
 *  6. Hardcoded fallback: 'gpt-4o'
 *
 * The resolved model is cached per-API-key for the lifetime of the browser
 * session so we only call /v1/models once.
 */

const cache = new Map<string, string>();

// Tier ordering — lower index = higher priority
const TIER_PATTERNS: RegExp[] = [
  /^gpt-4o-\d{4}-\d{2}-\d{2}$/,   // gpt-4o dated (newest first)
  /^gpt-4o$/,
  /^gpt-4-turbo-\d{4}-\d{2}-\d{2}$/, // gpt-4-turbo dated
  /^gpt-4-turbo$/,
  /^gpt-4$/,
];

const FALLBACK_MODEL = 'gpt-4o';

function tierOf(id: string): number {
  for (let i = 0; i < TIER_PATTERNS.length; i++) {
    if (TIER_PATTERNS[i].test(id)) return i;
  }
  return TIER_PATTERNS.length; // not matched → lowest priority
}

function pickBest(modelIds: string[]): string {
  // Filter to only models we know how to rank
  const candidates = modelIds.filter(id => tierOf(id) < TIER_PATTERNS.length);
  if (candidates.length === 0) return FALLBACK_MODEL;

  candidates.sort((a, b) => {
    const ta = tierOf(a);
    const tb = tierOf(b);
    if (ta !== tb) return ta - tb;
    // Same tier (dated variants) — sort lexicographically descending so latest date wins
    return b.localeCompare(a);
  });

  return candidates[0];
}

export async function resolveModel(apiKey: string): Promise<string> {
  if (cache.has(apiKey)) return cache.get(apiKey)!;

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return FALLBACK_MODEL;

    const data = await response.json();
    const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
    const best = pickBest(ids);

    cache.set(apiKey, best);
    return best;
  } catch {
    return FALLBACK_MODEL;
  }
}

export function clearModelCache(): void {
  cache.clear();
}
