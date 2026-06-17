import type { Reference, Comment } from '../types.js';

/** Hacker News Firebase API 아이템 타입 */
export interface HackerNewsItem {
  id: number;
  type: string;
  title?: string;
  url?: string;
  text?: string;
  by?: string;
  time: number;
  score?: number;
  descendants?: number;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}

/**
 * HN API 스토리 아이템을 Reference로 변환합니다.
 */
export function formatStory(story: HackerNewsItem): Reference {
  return {
    id: String(story.id),
    title: story.title || '',
    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    summary: story.type === 'job' ? 'Job posting' : '',
    source: 'hackernews',
    publishedAt: new Date(story.time * 1000).toISOString(),
    pointCount: story.score || 0,
    commentCount: story.descendants || 0,
  };
}

/**
 * HN API 댓글 아이템을 Comment로 변환합니다.
 * 삭제되었거나 dead인 댓글은 null을 반환합니다.
 */
export function formatComment(comment: HackerNewsItem): Comment | null {
  if (comment.deleted || comment.dead) {
    return null;
  }
  return {
    author: comment.by || '[deleted]',
    text: comment.text || '',
    publishedAt: new Date(comment.time * 1000).toISOString(),
  };
}
