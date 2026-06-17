import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { parseArxivFeed } from '../parsers/arxiv-parser.js';

const API_BASE = 'http://export.arxiv.org/api/query';

/** arXiv 논문 피드 소스 */
export class ArxivSource implements FeedSource {
  readonly name = 'arxiv';

  /**
   * arXiv API에서 XML을 가져옵니다.
   */
  private async fetchXML(url: string): Promise<string> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'harness-feed-mcp/0.1.0',
      },
    });
    if (!resp.ok) {
      throw new Error(`ArXiv API error: HTTP ${resp.status}`);
    }
    return resp.text();
  }

  /**
   * 최신 논문을 가져옵니다 (cs.AI + cs.CL 카테고리).
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const query = 'cat:cs.AI+OR+cat:cs.CL';
    const url = `${API_BASE}?search_query=${query}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${limit}`;
    const xml = await this.fetchXML(url);
    return parseArxivFeed(xml);
  }

  /**
   * 논문 검색 (제목/초록/저자 전체 텍스트 검색).
   * @param query - 검색어
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    const searchQuery = `all:${encodeURIComponent(query)}`;
    const url = `${API_BASE}?search_query=${searchQuery}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${limit}`;
    const xml = await this.fetchXML(url);
    return parseArxivFeed(xml);
  }

  /**
   * 특정 논문 상세 정보를 가져옵니다.
   * @param id - arXiv paper ID (예: "2406.12345")
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const url = `${API_BASE}?id_list=${encodeURIComponent(id)}&max_results=1`;
    const xml = await this.fetchXML(url);
    const items = parseArxivFeed(xml);

    if (items.length === 0) {
      throw new Error(`Paper ${id} not found`);
    }

    const ref = items[0];
    return {
      ...ref,
      content: ref.summary,
      comments: [],
    };
  }
}
