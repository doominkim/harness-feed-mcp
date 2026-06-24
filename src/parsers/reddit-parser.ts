import * as cheerio from 'cheerio';
import type { Reference, ReferenceDetail, Comment } from '../types.js';

/**
 * Reddit Atom entry의 id(`t3_1abc23`)에서 base36 post id를 추출합니다.
 */
function extractPostId(rawId: string): string {
  const trimmed = rawId.trim();
  const idx = trimmed.indexOf('_');
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

/** 텍스트의 연속된 공백을 하나로 정규화합니다. */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Atom entry의 content(HTML)에서 self post 본문 텍스트만 추출합니다.
 * Reddit은 본문을 `div.md`로 감싸고 뒤에 "submitted by ..." 푸터를 붙이므로,
 * `div.md`의 텍스트만 취합니다. link post는 본문이 비어 빈 문자열을 반환합니다.
 */
function extractBody(contentHtml: string): string {
  if (!contentHtml) {
    return '';
  }
  const $ = cheerio.load(contentHtml);
  const md = $('div.md').first();
  return cleanText(md.length > 0 ? md.text() : '');
}

/**
 * Reddit subreddit listing Atom XML을 파싱하여 Reference[]로 변환합니다.
 * RSS는 score/댓글수를 제공하지 않으므로 pointCount/commentCount는 0입니다
 * (arXiv 소스와 동일).
 */
export function parseRedditFeed(xml: string): Reference[] {
  const $ = cheerio.load(xml, { xml: true });
  const items: Reference[] = [];

  $('entry').each((_i, entry) => {
    const $entry = $(entry);
    const rawId = $entry.find('id').first().text();
    const id = extractPostId(rawId);
    const title = cleanText($entry.find('title').first().text());
    // 토론 페이지(permalink) 링크.
    const url = $entry.find('link').first().attr('href') || '';
    const published = $entry.find('published').first().text().trim();
    const contentHtml = $entry.find('content').first().text();
    const summary = extractBody(contentHtml).slice(0, 280);

    if (id && title) {
      items.push({
        id,
        title,
        url,
        summary,
        source: 'reddit',
        publishedAt: published,
        pointCount: 0,
        commentCount: 0,
      });
    }
  });

  return items;
}

/**
 * Reddit comments Atom XML을 파싱하여 ReferenceDetail로 변환합니다.
 * comments 피드의 entry는 id 접두사로 구분됩니다: `t3_`는 글 본문(1개),
 * `t1_`는 댓글입니다. self post는 본문 entry에 텍스트가 있고, link post는 비어
 * content가 빈 문자열이 됩니다.
 * @param xml - comments RSS 응답
 * @param id - 조회한 post id
 */
export function parseRedditComments(xml: string, id: string): ReferenceDetail {
  const $ = cheerio.load(xml, { xml: true });

  // feed title은 "<제목> : reddit.com" 형식이므로 접미사를 제거.
  const title = cleanText($('feed > title').first().text())
    .replace(/\s*:\s*reddit\.com\s*$/i, '');
  const feedLink = (
    $('feed > link[rel="alternate"]').first().attr('href') ||
    $('feed > link').first().attr('href') ||
    `https://www.reddit.com/comments/${id}`
  ).split('?')[0];

  const comments: Comment[] = [];
  let content = '';
  let publishedAt = '';

  $('entry').each((_i, entry) => {
    const $entry = $(entry);
    const entryId = $entry.find('id').first().text().trim();
    const author = cleanText($entry.find('author > name').first().text()) || '[deleted]';
    const html = $entry.find('content').first().text();
    // 댓글 entry는 <published> 없이 <updated>만 갖는다.
    const published =
      $entry.find('published').first().text().trim() ||
      $entry.find('updated').first().text().trim();
    const text = extractBody(html);

    if (entryId.startsWith('t3_')) {
      // 글 본문 entry.
      content = text;
      publishedAt = published;
    } else {
      comments.push({ author, text, publishedAt: published });
    }
  });

  return {
    id,
    title,
    url: feedLink,
    summary: content.slice(0, 280),
    source: 'reddit',
    publishedAt,
    pointCount: 0,
    commentCount: comments.length,
    content,
    comments,
  };
}
