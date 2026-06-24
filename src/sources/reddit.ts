import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { parseRedditFeed, parseRedditComments } from '../parsers/reddit-parser.js';

const execFileAsync = promisify(execFile);

const API_BASE = 'https://www.reddit.com';

// Reddit RSS는 명확한 User-Agent가 없으면 차단/429가 잦다.
const USER_AGENT = 'harness-feed-mcp/0.2.1 (+https://github.com/doominkim/harness-feed-mcp)';

/** getRecent에서 병합하는 기본 서브레딧 (AI + 프로그래밍 혼합) */
const DEFAULT_SUBREDDITS = [
  'MachineLearning',
  'LocalLLaMA',
  'programming',
  'technology',
];

/**
 * Reddit RSS 엔드포인트를 fetch합니다.
 *
 * Reddit은 .json을 봇 차단(403)할 뿐 아니라, node의 fetch(undici) TLS
 * fingerprint 자체를 차단(403)합니다. 헤더로는 우회되지 않으므로 시스템 `curl`을
 * 통해 요청합니다 (curl의 TLS fingerprint는 통과). curl은 macOS·대부분의 Linux·
 * Windows 10+ 에 기본 탑재됩니다.
 */
async function fetchRss(url: string): Promise<string> {
  let stdout: string;
  try {
    const res = await execFileAsync(
      'curl',
      ['-s', '--compressed', '--max-time', '20', '-A', USER_AGENT, '-w', '\n%{http_code}', url],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    stdout = res.stdout;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(
        'Reddit 소스는 시스템 curl이 필요합니다 (node fetch는 Reddit 봇 차단에 막힙니다).',
      );
    }
    throw new Error(`Reddit RSS 요청 실패: ${url} (${err.message})`);
  }

  // -w로 본문 끝에 "\n<http_code>"를 덧붙였으므로 마지막 줄이 상태 코드.
  const nl = stdout.lastIndexOf('\n');
  const status = nl >= 0 ? stdout.slice(nl + 1).trim() : '';
  const body = nl >= 0 ? stdout.slice(0, nl) : stdout;

  if (status !== '200') {
    // 429(rate limit) 시 본문이 비어 오는 경우 포함.
    throw new Error(`Reddit RSS error: HTTP ${status || 'unknown'} (${url})`);
  }
  if (!body.trim()) {
    throw new Error(`Reddit RSS returned empty body: ${url}`);
  }
  return body;
}

/** Reddit 피드 소스 (RSS 기반) */
export class RedditSource implements FeedSource {
  readonly name = 'reddit';

  /**
   * 특정 서브레딧의 listing을 가져와 Reference[]로 변환합니다.
   * @param subreddit - 서브레딧 이름 (r/ 접두사 없이)
   * @param sort - "hot" | "new" | "top" | "rising"
   * @param limit - 반환할 최대 개수
   */
  async getSubreddit(
    subreddit: string,
    sort: string = 'hot',
    limit: number = 20,
  ): Promise<Reference[]> {
    const url = `${API_BASE}/r/${encodeURIComponent(subreddit)}/${sort}.rss?limit=${limit}`;
    const xml = await fetchRss(url);
    return parseRedditFeed(xml).slice(0, limit);
  }

  /**
   * 최신 피드를 가져옵니다 (기본 서브레딧 통합, 시간순 정렬, 중복 제거).
   * RSS는 점수를 제공하지 않으므로 publishedAt 내림차순으로 병합합니다.
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const perSub = Math.max(Math.ceil(limit / DEFAULT_SUBREDDITS.length) + 5, 10);
    const results = await Promise.all(
      DEFAULT_SUBREDDITS.map((sub) =>
        this.getSubreddit(sub, 'hot', perSub).catch(() => [] as Reference[]),
      ),
    );

    // publishedAt 내림차순 병합 후 id 기준 중복 제거.
    const merged = results
      .flat()
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    const seen = new Set<string>();
    const deduped: Reference[] = [];
    for (const item of merged) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }

    return deduped.slice(0, limit);
  }

  /**
   * 제목/요약 기준 검색 (in-memory 텍스트 매칭).
   * @param query - 검색어 (대소문자 구분 없음)
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    const recent = await this.getRecent(100);
    const lowerQuery = query.toLowerCase();

    const matched = recent.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.summary.toLowerCase().includes(lowerQuery),
    );

    return matched.slice(0, limit);
  }

  /**
   * 특정 post 상세 정보를 가져옵니다 (본문 + 댓글).
   * @param id - Reddit post id (base36, 예: "1abc23")
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    // trailing slash가 있어야 서브레딧 없이 댓글 피드를 반환한다.
    // RSS는 댓글 점수를 제공하지 않으므로 sort=top으로 추천순 정렬을 받아
    // 상위(인기) 댓글이 앞에 오게 한다.
    const url = `${API_BASE}/comments/${encodeURIComponent(id)}/.rss?sort=top&limit=100`;
    const xml = await fetchRss(url);
    return parseRedditComments(xml, id);
  }
}
