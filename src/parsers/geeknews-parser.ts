import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { Cheerio } from 'cheerio';
import type { Reference, ReferenceDetail, Comment, WeeklyDigest } from '../types.js';

const BASE_URL = 'https://news.hada.io';

/** URL이 내부 링크(topic?id=)인지 확인하고 절대 URL로 변환 */
function resolveURL(href: string): string {
  if (href.startsWith('topic?id=')) {
    return `${BASE_URL}/${href}`;
  }
  if (href.startsWith('/')) {
    return `${BASE_URL}${href}`;
  }
  return href;
}

/** 상대 시간 텍스트 추출 */
function extractTime(_$: cheerio.CheerioAPI, el: Cheerio<AnyNode>): string {
  const timeEl = el.find('time.js-relative-time');
  if (timeEl.length > 0) {
    return timeEl.text().trim() || timeEl.attr('datetime') || '';
  }
  return '';
}

/**
 * 피드 페이지(top/new/ask/show) HTML을 파싱하여 Reference[] 반환
 */
export function parseFeed(html: string): Reference[] {
  const $ = cheerio.load(html);
  const items: Reference[] = [];

  $('.topic_row').each((_i, row) => {
    const $row = $(row);
    const id = $row.attr('data-topic-state-id') || '';

    // 제목
    const $titleLink = $row.find('.topictitle a').first();
    const title = $titleLink.find('h2.topic-title-heading').text().trim()
      || $titleLink.find('h2').text().trim()
      || $titleLink.text().trim();

    // URL
    let url = $titleLink.attr('href') || '';
    // 내부 링크(topic?id=)가 아닌 경우에만 외부 URL로 처리
    if (url && !url.startsWith('topic?id=')) {
      url = resolveURL(url);
    }

    // 요약
    const summary = $row.find('.topicdesc a.c99, .topicdesc a').first().text().trim();

    // 포인트
    const pointText = $row.find('.topicinfo span[id^="tp"]').first().text().trim();
    const pointCount = parseInt(pointText, 10) || 0;

    // 댓글 수
    const commentCountAttr = $row.find('[data-topic-comment-count]').attr('data-topic-comment-count');
    const commentCount = parseInt(commentCountAttr || '0', 10);

    // 시간
    const publishedAt = extractTime($, $row);

    if (id && title) {
      items.push({
        id,
        title,
        url,
        summary,
        source: 'geeknews',
        publishedAt,
        pointCount,
        commentCount,
      });
    }
  });

  return items;
}

/**
 * 토픽 상세 페이지 HTML을 파싱하여 ReferenceDetail 반환
 */
export function parseTopicDetail(html: string, id: string): ReferenceDetail {
  const $ = cheerio.load(html);

  const $topic = $('.topic-table .topic, .topic').first();

  // 제목
  const $titleLink = $topic.find('.topictitle a.bold, .topictitle a').first();
  const title = $titleLink.find('h1').text().trim()
    || $titleLink.find('h2').text().trim()
    || $titleLink.text().trim();

  // 원문 URL
  const url = $titleLink.attr('href') || '';

  // 포인트
  const pointText = $topic.find('.topicinfo span[id^="tp"]').first().text().trim();
  const pointCount = parseInt(pointText, 10) || 0;

  // 댓글 수
  const commentCountAttr = $topic.find('[data-topic-comment-count]').attr('data-topic-comment-count');
  const commentCount = parseInt(commentCountAttr || '0', 10);

  // 시간
  const publishedAt = extractTime($, $topic);

  // 본문
  const content = $topic.find('#topic_contents').html() || '';

  // 요약 (topic_contents의 첫 p 태그 텍스트)
  const summary = $topic.find('#topic_contents p').first().text().trim();

  // 댓글
  const comments: Comment[] = [];
  $('#comment_thread .comment_row').each((_i, row) => {
    const $row = $(row);
    const author = $row.find('.commentinfo a[href^="/@"]').first().text().trim();
    const text = $row.find('.commentTD .comment_contents').text().trim();
    const publishedAt = extractTime($, $row);

    if (author || text) {
      comments.push({ author, text, publishedAt });
    }
  });

  return {
    id,
    title,
    url,
    summary,
    source: 'geeknews',
    publishedAt,
    pointCount,
    commentCount,
    content,
    comments,
  };
}

/**
 * Weekly 아카이브 페이지에서 주간 다이제스트 목록 추출
 */
export function parseWeeklyArchive(html: string): { id: string; title: string }[] {
  const $ = cheerio.load(html);
  const items: { id: string; title: string }[] = [];

  $('.weekly').each((_i, row) => {
    const $row = $(row);
    const cells = $row.find('div');
    if (cells.length >= 3) {
      const id = $(cells[1]).text().trim();
      const title = $(cells[2]).find('a').text().trim();
      if (id && title) {
        items.push({ id, title });
      }
    }
  });

  return items;
}

/**
 * Weekly 상세 페이지를 파싱하여 WeeklyDigest 반환.
 * 참조된 topic ID들을 추출하여 items에 포함.
 */
export function parseWeeklyDetail(html: string, id: string): WeeklyDigest {
  const $ = cheerio.load(html);

  // 제목
  const title = $('h2').first().text().trim() || `Weekly #${id}`;

  // Weekly에 포함된 topic 링크에서 ID 추출
  const topicIds = new Set<string>();
  $('a[href*="topic?id="]').each((_i, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/topic\?id=(\d+)/);
    if (match) {
      topicIds.add(match[1]);
    }
  });

  // topic ID 목록을 Reference[]로 변환 (최소 정보만 포함, 상세는 getItem으로 조회)
  const items: Reference[] = Array.from(topicIds).map((topicId) => ({
    id: topicId,
    title: '',
    url: `${BASE_URL}/topic?id=${topicId}`,
    summary: '',
    source: 'geeknews',
    publishedAt: '',
    pointCount: 0,
    commentCount: 0,
  }));

  return {
    id,
    title,
    url: `${BASE_URL}/weekly/${id}`,
    items,
  };
}
