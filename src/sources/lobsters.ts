import type { FeedSource, Reference, ReferenceDetail } from '../types.js';
import { formatStory, formatStoryDetail } from '../parsers/lobsters-parser.js';
import type { LobstersStory, LobstersComment } from '../parsers/lobsters-parser.js';

const API_BASE = 'https://lobste.rs';

/** Lobste.rs 피드 소스 */
export class LobstersSource implements FeedSource {
  readonly name = 'lobsters';

  /**
   * Lobste.rs JSON API에서 스토리 목록을 가져옵니다.
   */
  private async fetchStories(endpoint: string): Promise<LobstersStory[]> {
    const resp = await fetch(`${API_BASE}/${endpoint}.json`);
    if (!resp.ok) {
      throw new Error(`Lobste.rs API error: HTTP ${resp.status} (${endpoint})`);
    }
    return resp.json();
  }

  /**
   * 단일 스토리 상세 정보를 가져옵니다.
   */
  private async fetchStory(id: string): Promise<LobstersStory & { comments?: LobstersComment[] }> {
    const resp = await fetch(`${API_BASE}/s/${id}.json`);
    if (!resp.ok) {
      throw new Error(`Lobste.rs story not found: ${id} (HTTP ${resp.status})`);
    }
    return resp.json();
  }

  /**
   * 카테고리별 피드를 가져옵니다.
   * @param type - "hottest" | "newest"
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getFeed(type: string, limit: number = 20): Promise<Reference[]> {
    const validTypes = ['hottest', 'newest'];
    if (!validTypes.includes(type)) {
      throw new Error(`Unknown feed type: ${type}. Use "hottest" or "newest".`);
    }

    const stories = await this.fetchStories(type);
    return stories.slice(0, limit).map(formatStory);
  }

  /**
   * 최신 피드를 가져옵니다 (hottest 기준).
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const stories = await this.fetchStories('hottest');
    return stories.slice(0, limit).map(formatStory);
  }

  /**
   * 제목/설명 기준 검색 (in-memory 텍스트 매칭).
   * @param query - 검색어 (대소문자 구분 없음)
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    // hottest와 newest를 모두 가져와서 더 넓은 검색 풀 구성
    const [hottest, newest] = await Promise.all([
      this.fetchStories('hottest'),
      this.fetchStories('newest'),
    ]);

    const seen = new Set<string>();
    const merged: Reference[] = [];
    for (const story of [...hottest, ...newest]) {
      if (!seen.has(story.short_id)) {
        seen.add(story.short_id);
        merged.push(formatStory(story));
      }
    }

    const lowerQuery = query.toLowerCase();
    const matched = merged.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.summary.toLowerCase().includes(lowerQuery),
    );

    return matched.slice(0, limit);
  }

  /**
   * 특정 스토리 상세 정보를 가져옵니다 (댓글 포함).
   * @param id - Lobste.rs short_id
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const story = await this.fetchStory(id);
    return formatStoryDetail(story);
  }
}
