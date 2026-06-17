import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { fetchHTML } from '../fetcher.js';
import { parseTLDRPage } from '../parsers/tldr-parser.js';

const BASE_URL = 'https://tldr.tech';

/** TLDR 뉴스레터 피드 소스 */
export class TldrSource implements FeedSource {
  readonly name = 'tldr';

  /**
   * 최신 TLDR 피드를 가져옵니다.
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const html = await fetchHTML(BASE_URL);
    const items = parseTLDRPage(html, 'tech');
    return items.slice(0, limit);
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
   * 특정 아티클의 상세 정보를 가져옵니다.
   * TLDR는 원본 기사 링크를 포함하므로, 해당 페이지를 가져옵니다.
   * @param id - TLDR story id
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    // ID가 숫자면 recent 목록에서 찾아서 url 기반으로 콘텐츠 가져오기
    const recent = await this.getRecent(100);
    const found = recent.find((r) => r.id === id);

    if (!found) {
      throw new Error(`TLDR story ${id} not found`);
    }

    let content = '';
    try {
      const html = await fetchHTML(found.url);
      // 간단하게 article, main, 또는 body 콘텐츠 추출 시도
      const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (bodyMatch) {
        content = bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch) {
          content = mainMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
        }
      }
    } catch {
      // 콘텐츠를 가져오지 못하면 summary로 대체
      content = found.summary;
    }

    return {
      ...found,
      content: content || found.summary,
      comments: [],
    };
  }
}
