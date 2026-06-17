/** 피드 기사 기본 정보 */
export interface Reference {
  /** GeekNews topic id (e.g. "30554") */
  id: string;
  /** 기사 제목 */
  title: string;
  /** 원문 링크 */
  url: string;
  /** GeekNews 요약 텍스트 */
  summary: string;
  /** 데이터 소스 구분 (e.g. "geeknews") */
  source: string;
  /** 상대 시간 (e.g. "22시간전") */
  publishedAt: string;
  /** 추천 수 */
  pointCount: number;
  /** 댓글 수 */
  commentCount: number;
}

/** GeekNews 댓글 */
export interface Comment {
  author: string;
  text: string;
  publishedAt: string;
}

/** 기사 상세 정보 (본문 + 댓글 포함) */
export interface ReferenceDetail extends Reference {
  /** 본문 전문 */
  content: string;
  /** 댓글 목록 */
  comments: Comment[];
}

/** 주간 다이제스트 */
export interface WeeklyDigest {
  id: string;
  title: string;
  url: string;
  /** 주간 다이제스트에 포함된 기사 목록 */
  items: Reference[];
}

/** 피드 소스 어댑터 인터페이스 */
export interface FeedSource {
  readonly name: string;
  search(query: string): Promise<Reference[]>;
  getRecent(limit: number): Promise<Reference[]>;
  getFeed?(type: string, limit: number): Promise<Reference[]>;
  getWeekly?(): Promise<WeeklyDigest>;
  getItem?(id: string): Promise<ReferenceDetail>;
}

/** feed type */
export type FeedType = 'top' | 'new' | 'ask' | 'show';
