import type { Reference, ReferenceDetail } from '../types.js';

/** HuggingFace daily papers API 페이퍼 타입 */
interface HFDailyPaper {
  paper: {
    id: string;
    title: string;
    summary: string;
    publishedAt: string;
  };
  upvotes?: number;
}

/** HuggingFace paper detail API 타입 */
interface HFPaperDetail {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  upvotes?: number;
  authors?: { name: string }[];
}

/**
 * HuggingFace daily paper을 Reference로 변환합니다.
 */
export function formatPaper(paper: HFDailyPaper): Reference {
  const p = paper.paper;
  return {
    id: p.id,
    title: p.title,
    url: `https://huggingface.co/papers/${p.id}`,
    summary: p.summary || '',
    source: 'paperswithcode',
    publishedAt: p.publishedAt,
    pointCount: paper.upvotes || 0,
    commentCount: 0,
  };
}

/**
 * HuggingFace paper detail을 ReferenceDetail로 변환합니다.
 */
export function formatPaperDetail(paper: HFPaperDetail): ReferenceDetail {
  return {
    id: paper.id,
    title: paper.title,
    url: `https://huggingface.co/papers/${paper.id}`,
    summary: paper.summary || '',
    source: 'paperswithcode',
    publishedAt: paper.publishedAt,
    pointCount: paper.upvotes || 0,
    commentCount: 0,
    content: paper.summary || '',
    comments: [],
  };
}
