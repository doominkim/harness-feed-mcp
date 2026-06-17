import type { FeedSource, Reference, ReferenceDetail, WeeklyDigest, FeedType } from '../types.js';
import { fetchHTML } from '../fetcher.js';
import {
  parseFeed,
  parseTopicDetail,
  parseWeeklyArchive,
  parseWeeklyDetail,
} from '../parsers/geeknews-parser.js';

const BASE_URL = 'https://news.hada.io';

/** GeekNews 피드 소스 */
export class GeekNewsSource implements FeedSource {
  readonly name = 'geeknews';

  /**
   * 카테고리별 피드를 가져옵니다.
   * @param type - "top" | "new" | "ask" | "show"
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getFeed(type: FeedType, limit: number = 20): Promise<Reference[]> {
    const path = type === 'top' ? '' : `/${type}`;
    const url = `${BASE_URL}${path}`;
    const html = await fetchHTML(url);
    const items = parseFeed(html);
    return items.slice(0, limit);
  }

  /**
   * 최신 피드를 가져옵니다.
   * top과 new 피드를 합쳐 중복 제거 후 최신순으로 반환합니다.
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const [topItems, newItems] = await Promise.all([
      this.getFeed('top', 100),
      this.getFeed('new', 100),
    ]);

    // 중복 제거 (id 기준)
    const seen = new Set<string>();
    const merged: Reference[] = [];

    for (const item of [...topItems, ...newItems]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    return merged.slice(0, limit);
  }

  /**
   * 제목/요약 기준 검색 (in-memory 텍스트 매칭)
   * @param query - 검색어 (대소문자 구분 없음)
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    const recent = await this.getRecent(100);
    const lowerQuery = query.toLowerCase();

    const matched = recent.filter((item) => {
      return (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.summary.toLowerCase().includes(lowerQuery)
      );
    });

    return matched.slice(0, limit);
  }

  /**
   * 특정 아티클 상세 정보를 가져옵니다.
   * @param id - GeekNews topic id
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const url = `${BASE_URL}/topic?id=${id}`;
    const html = await fetchHTML(url);
    return parseTopicDetail(html, id);
  }

  /**
   * 주간 다이제스트를 가져옵니다.
   * @param weeklyId - 주간 ID (없으면 최신)
   */
  async getWeekly(weeklyId?: string): Promise<WeeklyDigest> {
    if (weeklyId) {
      const url = `${BASE_URL}/weekly/${weeklyId}`;
      const html = await fetchHTML(url);
      return parseWeeklyDetail(html, weeklyId);
    }

    // 최신 weekly 찾기
    const archiveUrl = `${BASE_URL}/weekly`;
    const archiveHtml = await fetchHTML(archiveUrl);
    const archives = parseWeeklyArchive(archiveHtml);

    if (archives.length === 0) {
      throw new Error('주간 다이제스트를 찾을 수 없습니다.');
    }

    const latest = archives[0];
    return this.getWeekly(latest.id);
  }
}
