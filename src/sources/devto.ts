import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { formatArticle, formatArticleDetail } from '../parsers/devto-parser.js';
import type { DevtoComment } from '../parsers/devto-parser.js';

const API_BASE = 'https://dev.to/api';

/** Dev.to 피드 소스 */
export class DevtoSource implements FeedSource {
  readonly name = 'devto';

  /**
   * API에서 articles를 가져옵니다.
   */
  private async fetchArticles(tag: string, limit: number): Promise<Reference[]> {
    const url = `${API_BASE}/articles?tag=${encodeURIComponent(tag)}&per_page=${limit}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'harness-feed-mcp/0.1.0' },
    });
    if (!resp.ok) {
      throw new Error(`Dev.to API error: HTTP ${resp.status}`);
    }
    const articles = await resp.json();
    return articles.map((a: Record<string, unknown>) => formatArticle(a as never));
  }

  /**
   * 최신 피드를 가져옵니다 (ai + programming 태그 병합, 중복 제거).
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const fetchLimit = Math.min(limit * 2, 100);
    const [aiArticles, progArticles] = await Promise.all([
      this.fetchArticles('ai', fetchLimit),
      this.fetchArticles('programming', fetchLimit),
    ]);

    // 중복 제거 (id 기준)
    const seen = new Set<string>();
    const merged: Reference[] = [];
    for (const item of [...aiArticles, ...progArticles]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    return merged.slice(0, limit);
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
   * 특정 article 상세 정보를 가져옵니다 (댓글 포함).
   * @param id - Dev.to article id
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const [articleResp, commentsResp] = await Promise.all([
      fetch(`${API_BASE}/articles/${id}`, {
        headers: { 'User-Agent': 'harness-feed-mcp/0.1.0' },
      }),
      fetch(`${API_BASE}/comments?a_id=${id}`, {
        headers: { 'User-Agent': 'harness-feed-mcp/0.1.0' },
      }),
    ]);

    if (!articleResp.ok) {
      throw new Error(`Dev.to article not found: ${id} (HTTP ${articleResp.status})`);
    }

    const article = await articleResp.json();
    const comments: DevtoComment[] = commentsResp.ok ? await commentsResp.json() : [];

    return formatArticleDetail(article as never, comments);
  }
}
