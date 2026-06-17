import * as cheerio from 'cheerio';
import type { Reference } from '../types.js';

/** 텍스트의 연속된 공백을 하나의 공백으로 정규화합니다. */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * arXiv Atom XML 피드를 파싱하여 Reference[]로 변환합니다.
 */
export function parseArxivFeed(xml: string): Reference[] {
  const $ = cheerio.load(xml, { xml: true });
  const items: Reference[] = [];

  $('entry').each((_i, entry) => {
    const $entry = $(entry);

    // ID URL에서 paper ID 추출 (예: http://arxiv.org/abs/2406.12345v1 → 2406.12345)
    const idUrl = $entry.find('id').first().text().trim();
    const idMatch = idUrl.match(/arxiv\.org\/abs\/(.+?)(?:v\d+)?$/);
    const paperId = idMatch ? idMatch[1] : idUrl;

    const title = cleanText($entry.find('title').first().text());
    const summary = cleanText($entry.find('summary').first().text());
    const published = $entry.find('published').first().text().trim();

    // 저자 목록 추출
    const authors: string[] = [];
    $entry.find('author name').each((_j, name) => {
      const authorName = $(name).text().trim();
      if (authorName) {
        authors.push(authorName);
      }
    });

    const authorSummary = authors.length > 0
      ? `Authors: ${authors.join(', ')}. ${summary}`
      : summary;

    if (paperId && title) {
      items.push({
        id: paperId,
        title,
        url: `https://arxiv.org/abs/${paperId}`,
        summary: authorSummary,
        source: 'arxiv',
        publishedAt: published,
        pointCount: 0,
        commentCount: 0,
      });
    }
  });

  return items;
}
