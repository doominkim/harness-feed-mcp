import type { FeedSource, Reference, ReferenceDetail, Comment } from '../types.js';
import { formatStory, formatComment } from '../parsers/hackernews-parser.js';
import type { HackerNewsItem } from '../parsers/hackernews-parser.js';

const API_BASE = 'https://hacker-news.firebaseio.com/v0';

/** Hacker News 피드 소스 */
export class HackerNewsSource implements FeedSource {
  readonly name = 'hackernews';

  /**
   * 카테고리별 스토리 ID 목록을 가져옵니다.
   */
  private async fetchStoryIds(endpoint: string): Promise<number[]> {
    const resp = await fetch(`${API_BASE}/${endpoint}.json`);
    if (!resp.ok) {
      throw new Error(`Failed to fetch ${endpoint}: HTTP ${resp.status}`);
    }
    return resp.json();
  }

  /**
   * 특정 아이템을 가져옵니다.
   */
  private async fetchItem(id: number): Promise<HackerNewsItem | null> {
    const resp = await fetch(`${API_BASE}/item/${id}.json`);
    if (!resp.ok) {
      return null;
    }
    return resp.json();
  }

  /**
   * 카테고리별 피드를 가져옵니다.
   * @param type - "top" | "new" | "ask" | "show"
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getFeed(type: string, limit: number = 20): Promise<Reference[]> {
    const typeMap: Record<string, string> = {
      top: 'topstories',
      new: 'newstories',
      ask: 'askstories',
      show: 'showstories',
    };
    const endpoint = typeMap[type];
    if (!endpoint) {
      throw new Error(`Unknown feed type: ${type}`);
    }

    const ids = await this.fetchStoryIds(endpoint);
    const storyIds = ids.slice(0, limit);
    const stories = await Promise.all(
      storyIds.map((id) => this.fetchItem(id)),
    );

    return stories
      .filter((s): s is HackerNewsItem => s !== null)
      .map((s) => formatStory(s));
  }

  /**
   * 최신 피드를 가져옵니다.
   * top과 new 피드를 합쳐 중복 제거 후 반환합니다.
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async getRecent(limit: number = 20): Promise<Reference[]> {
    const [topIds, newIds] = await Promise.all([
      this.fetchStoryIds('topstories'),
      this.fetchStoryIds('newstories'),
    ]);

    // 중복 제거 (id 기준) — ID 레벨에서 먼저 dedup 후 필요한 만큼만 fetch
    const seen = new Set<number>();
    const merged: number[] = [];
    for (const id of [...topIds, ...newIds]) {
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }

    const ids = merged.slice(0, limit);
    const stories = await Promise.all(
      ids.map((id) => this.fetchItem(id)),
    );

    return stories
      .filter((s): s is HackerNewsItem => s !== null)
      .map((s) => formatStory(s));
  }

  /**
   * 제목 기준 검색 (in-memory 텍스트 매칭)
   * @param query - 검색어 (대소문자 구분 없음)
   * @param limit - 반환할 최대 개수 (기본 20)
   */
  async search(query: string, limit: number = 20): Promise<Reference[]> {
    const recent = await this.getRecent(100);
    const lowerQuery = query.toLowerCase();

    const matched = recent.filter((item) =>
      item.title.toLowerCase().includes(lowerQuery),
    );

    return matched.slice(0, limit);
  }

  /**
   * 특정 스토리 상세 정보를 가져옵니다 (상위 댓글 포함).
   * @param id - Hacker News story id
   */
  async getItem(id: string): Promise<ReferenceDetail> {
    const story = await this.fetchItem(parseInt(id, 10));
    if (!story) {
      throw new Error(`Story ${id} not found`);
    }

    const ref = formatStory(story);

    // 상위 댓글만 가져옴 (최대 20개)
    const commentIds = (story.kids || []).slice(0, 20);
    const commentResults = await Promise.all(
      commentIds.map((cid) => this.fetchItem(cid)),
    );

    const comments: Comment[] = [];
    for (const c of commentResults) {
      if (c) {
        const formatted = formatComment(c);
        if (formatted) {
          comments.push(formatted);
        }
      }
    }

    return {
      ...ref,
      content: story.text || story.url || '',
      comments,
    };
  }
}
