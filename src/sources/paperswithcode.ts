import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { formatPaper, formatPaperDetail } from '../parsers/paperswithcode-parser.js';

const API_BASE = 'https://huggingface.co/api';

/** Papers with Code / HuggingFace Papers 피드 소스 */
export class PapersWithCodeSource implements FeedSource {
  readonly name = 'paperswithcode';

  /**
   * HuggingFace API에서 daily papers를 가져옵니다.
   */
  private async fetchDailyPapers(limit: number): Promise<Reference[]> {
    const resp = await fetch(`${API_BASE}/daily_papers`, {
      headers: { 'User-Agent': 'harness-feed-mcp/0.1.0' },
    });
    if (!resp.ok) {
      throw new Error(`HuggingFace API error: HTTP ${resp.status}`);
    }
    const papers = await resp.json();
    return papers.slice(0, limit).map((p: Record<string, unknown>) => formatPaper(p as never));
  }

  /**
   * 최신 논문을 가져옵니다.
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    return this.fetchDailyPapers(limit);
  }

  /**
   * 논문 검색 (in-memory 텍스트 매칭).
   * @param query - 검색어 (대소문자 구분 없음)
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    const recent = await this.fetchDailyPapers(100);
    const lowerQuery = query.toLowerCase();

    const matched = recent.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.summary.toLowerCase().includes(lowerQuery),
    );

    return matched.slice(0, limit);
  }

  /**
   * 특정 논문 상세 정보를 가져옵니다.
   * @param id - paper ID (예: "2605.23904")
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const resp = await fetch(`${API_BASE}/papers/${encodeURIComponent(id)}`, {
      headers: { 'User-Agent': 'harness-feed-mcp/0.1.0' },
    });
    if (!resp.ok) {
      throw new Error(`Paper not found: ${id} (HTTP ${resp.status})`);
    }
    const paper = await resp.json();
    return formatPaperDetail(paper);
  }
}
