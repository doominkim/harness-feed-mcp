import type { Reference, ReferenceDetail, Comment } from '../types.js';

/** Lobste.rs API 스토리 타입 */
export interface LobstersStory {
  short_id: string;
  title: string;
  url: string;
  description: string;
  score: number;
  comment_count: number;
  created_at: string;
  tags: string[];
}

/** Lobste.rs API 댓글 타입 (재귀적) */
export interface LobstersComment {
  short_id: string;
  commenting_user: { username: string } | null;
  comment: string;
  created_at: string;
  comments?: LobstersComment[];
}

/**
 * Lobste.rs 스토리를 Reference로 변환합니다.
 */
export function formatStory(story: LobstersStory): Reference {
  return {
    id: story.short_id,
    title: story.title,
    url: story.url || `https://lobste.rs/s/${story.short_id}`,
    summary: story.description || '',
    source: 'lobsters',
    publishedAt: story.created_at,
    pointCount: story.score,
    commentCount: story.comment_count,
  };
}

/**
 * 중첩된 Lobste.rs 댓글을 평탄화하여 Comment[]로 변환합니다.
 */
function flattenComments(comments: LobstersComment[]): Comment[] {
  const result: Comment[] = [];
  for (const c of comments) {
    result.push({
      author: c.commenting_user?.username || 'anonymous',
      text: c.comment || '',
      publishedAt: c.created_at,
    });
    if (c.comments && c.comments.length > 0) {
      result.push(...flattenComments(c.comments));
    }
  }
  return result;
}

/**
 * Lobste.rs 스토리 + 댓글을 ReferenceDetail로 변환합니다.
 */
export function formatStoryDetail(
  story: LobstersStory & { comments?: LobstersComment[] },
): ReferenceDetail {
  const ref = formatStory(story);
  return {
    ...ref,
    content: story.description || '',
    comments: story.comments ? flattenComments(story.comments) : [],
  };
}
