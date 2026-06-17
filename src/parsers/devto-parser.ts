import type { Reference, ReferenceDetail, Comment } from '../types.js';

/** Dev.to Forem API article 타입 */
interface DevtoArticle {
  id: number;
  title: string;
  url: string;
  description: string;
  published_at: string;
  positive_reactions_count: number;
  comments_count: number;
  body_html?: string;
  body_markdown?: string;
  user: { name: string };
}

/** Dev.to Forem API comment 타입 */
export interface DevtoComment {
  id_code: string;
  body_html: string;
  created_at: string;
  user: { name: string; username: string };
  children: DevtoComment[];
}

/**
 * Dev.to API article을 Reference로 변환합니다.
 */
export function formatArticle(article: DevtoArticle): Reference {
  return {
    id: String(article.id),
    title: article.title,
    url: article.url,
    summary: article.description || '',
    source: 'devto',
    publishedAt: article.published_at,
    pointCount: article.positive_reactions_count || 0,
    commentCount: article.comments_count || 0,
  };
}

/**
 * 중첩된 Dev.to 댓글을 평탄화하여 Comment[]로 변환합니다.
 */
function flattenComments(comments: DevtoComment[]): Comment[] {
  const result: Comment[] = [];
  for (const c of comments) {
    result.push({
      author: c.user?.name || c.user?.username || 'anonymous',
      text: c.body_html || '',
      publishedAt: c.created_at,
    });
    if (c.children && c.children.length > 0) {
      result.push(...flattenComments(c.children));
    }
  }
  return result;
}

/**
 * Dev.to API article + comments를 ReferenceDetail로 변환합니다.
 */
export function formatArticleDetail(
  article: DevtoArticle,
  comments: DevtoComment[],
): ReferenceDetail {
  return {
    ...formatArticle(article),
    content: article.body_html || article.description || '',
    comments: flattenComments(comments),
  };
}
