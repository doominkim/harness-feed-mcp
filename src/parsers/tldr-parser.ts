import type { Reference } from '../types.js';

/** TLDR 스토리 (embedded JSON에서 추출) */
interface TLDRStoryRaw {
  id: number;
  title: string;
  url: string;
  tldr: string;
  date: string;
  newsletter?: string;
  category?: string;
  imageUrl?: string;
  totalClicks?: string;
}

/**
 * TLDR 페이지에서 embedded JSON 데이터를 추출합니다.
 * Next.js SSR 페이지의 script 태그에서 `featuredStories`와 `recentStories`를 찾습니다.
 */
export function parseTLDRPage(html: string, newsletter: string = 'tech'): Reference[] {
  const stories: TLDRStoryRaw[] = [];

  // Next.js __next_f 스크립트에서 JSON 데이터 추출
  // featuredStories 또는 recentStories 배열이 포함된 부분을 찾습니다.
  const featuredMatch = html.match(/"featuredStories"\s*:\s*(\[[^\]]*(?:\][^\]]*)*?\])/s);
  if (featuredMatch) {
    try {
      const parsed = JSON.parse(featuredMatch[1]);
      if (Array.isArray(parsed)) {
        stories.push(...parsed);
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }

  // recentStories에서 해당 뉴스레터의 스토리 추출
  const recentMatch = html.match(/"recentStories"\s*:\s*(\{[^}]*\})/s);
  if (recentMatch) {
    try {
      const parsed = JSON.parse(recentMatch[1]);
      const newsletterStories = parsed[newsletter];
      if (Array.isArray(newsletterStories)) {
        stories.push(...newsletterStories);
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }

  // cheerio fallback: HTML에서 직접 article 링크 추출
  if (stories.length === 0) {
    return parseTLDRFallback(html);
  }

  // 중복 제거
  const seen = new Set<number>();
  const unique: TLDRStoryRaw[] = [];
  for (const s of stories) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      unique.push(s);
    }
  }

  return unique.map(formatTLDRStory);
}

/**
 * cheerio를 사용한 fallback 파싱.
 * `<a target="_blank" href="..."><div><h3>Title</h3></div></a>` 형태의 링크에서 추출합니다.
 */
function parseTLDRFallback(html: string): Reference[] {
  // 단순 정규식으로 external link 추출
  const linkRegex = /<a[^>]*target="_blank"[^>]*href="(https?:\/\/[^"]*)"[^>]*>.*?<h3[^>]*>([^<]+)<\/h3>/gs;
  const results: Reference[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  match = linkRegex.exec(html);
  while (match !== null) {
    const url = match[1];
    const title = match[2].trim();

    // tldr.tech 자체 링크는 제외
    if (url.includes('tldr.tech')) continue;

    results.push({
      id: `tldr-fallback-${idx++}`,
      title,
      url,
      summary: '',
      source: 'tldr',
      publishedAt: '',
      pointCount: 0,
      commentCount: 0,
    });

    match = linkRegex.exec(html);
  }

  return results;
}

/**
 * TLDR 스토리를 Reference로 변환합니다.
 */
function formatTLDRStory(story: TLDRStoryRaw): Reference {
  return {
    id: String(story.id),
    title: story.title,
    url: story.url,
    summary: story.tldr || '',
    source: 'tldr',
    publishedAt: story.date || '',
    pointCount: story.totalClicks ? parseInt(story.totalClicks, 10) : 0,
    commentCount: 0,
  };
}
