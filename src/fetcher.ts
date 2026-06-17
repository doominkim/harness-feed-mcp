const USER_AGENT = 'harness-feed-mcp/0.1.0';

const CACHE_TTL_SECONDS = (() => {
  const env = process.env.HARNESS_FEED_CACHE_TTL_SECONDS;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
})();

interface CacheEntry {
  body: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * URL에서 HTML을 fetch합니다.
 * HARNESS_FEED_CACHE_TTL_SECONDS 환경변수가 설정되어 있으면 in-memory 캐시를 사용합니다.
 */
export async function fetchHTML(url: string): Promise<string> {
  // in-memory cache 확인
  if (CACHE_TTL_SECONDS > 0) {
    const entry = cache.get(url);
    if (entry) {
      const age = (Date.now() - entry.fetchedAt) / 1000;
      if (age < CACHE_TTL_SECONDS) {
        return entry.body;
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }

  const body = await response.text();

  if (CACHE_TTL_SECONDS > 0) {
    cache.set(url, { body, fetchedAt: Date.now() });
  }

  return body;
}

/** 캐시를 초기화합니다 */
export function clearCache(): void {
  cache.clear();
}
