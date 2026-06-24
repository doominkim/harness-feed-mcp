import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { GeekNewsSource } from './sources/geeknews.js';
import { HackerNewsSource } from './sources/hackernews.js';
import { ArxivSource } from './sources/arxiv.js';
import { LobstersSource } from './sources/lobsters.js';
import { DevtoSource } from './sources/devto.js';
import { TldrSource } from './sources/tldr.js';
import { PapersWithCodeSource } from './sources/paperswithcode.js';
import { RedditSource } from './sources/reddit.js';
import type { FeedType } from './types.js';

export function createServer(): McpServer {
  const geeknews = new GeekNewsSource();
  const hackernews = new HackerNewsSource();
  const arxiv = new ArxivSource();
  const lobsters = new LobstersSource();
  const devto = new DevtoSource();
  const tldr = new TldrSource();
  const paperswithcode = new PapersWithCodeSource();
  const reddit = new RedditSource();
  const server = new McpServer({
    name: 'harness-feed-mcp',
    version: '0.1.0',
  });

  // ===== GeekNews =====

  server.registerTool('get_feed', {
    description: '카테고리별 GeekNews 아티클을 조회합니다.',
    inputSchema: z.object({
      type: z.enum(['top', 'new', 'ask', 'show']).describe('피드 타입'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const type = args.type as string;
    const limit = args.limit as number;
    const items = await geeknews.getFeed(type as FeedType, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_recent_feed', {
    description: '최신 GeekNews 아티클을 조회합니다 (top + new 통합, 중복 제거).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await geeknews.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_feed', {
    description: 'GeekNews 아티클을 제목/요약 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await geeknews.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_weekly', {
    description: '주간 GeekNews Weekly 다이제스트를 조회합니다.',
    inputSchema: z.object({
      weeklyId: z.string().optional().describe('주간 ID (없으면 최신)'),
    }),
  }, async (args: Record<string, unknown>) => {
    const weeklyId = args.weeklyId as string | undefined;
    const digest = await geeknews.getWeekly(weeklyId);
    return { content: [{ type: 'text' as const, text: JSON.stringify(digest, null, 2) }] };
  });

  server.registerTool('get_item', {
    description: '특정 GeekNews 아티클의 상세 정보(본문 + 댓글)를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('GeekNews topic id (예: "30554")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await geeknews.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== Hacker News =====

  server.registerTool('get_hackernews', {
    description: 'Hacker News의 카테고리별 아티클을 조회합니다.',
    inputSchema: z.object({
      type: z.enum(['top', 'new', 'ask', 'show']).describe('피드 타입'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const type = args.type as string;
    const limit = args.limit as number;
    const items = await hackernews.getFeed(type, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_hackernews_recent', {
    description: '최신 Hacker News 아티클을 조회합니다 (top + new 통합, 중복 제거).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await hackernews.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_hackernews', {
    description: 'Hacker News 아티클을 제목 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await hackernews.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_hackernews_item', {
    description: '특정 Hacker News 아티클의 상세 정보(본문 + 상위 댓글)를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('Hacker News story id (예: "41709300")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await hackernews.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== arXiv =====

  server.registerTool('get_arxiv_recent', {
    description: 'arXiv의 최신 논문을 조회합니다 (cs.AI + cs.CL 카테고리).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await arxiv.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_arxiv', {
    description: 'arXiv 논문을 제목/초록/저자 기준으로 검색합니다.',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await arxiv.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_arxiv_item', {
    description: '특정 arXiv 논문의 상세 정보를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('arXiv paper ID (예: "2406.12345")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await arxiv.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== Lobste.rs =====

  server.registerTool('get_lobsters', {
    description: 'Lobste.rs의 카테고리별 아티클을 조회합니다.',
    inputSchema: z.object({
      type: z.enum(['hottest', 'newest']).describe('피드 타입'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const type = args.type as string;
    const limit = args.limit as number;
    const items = await lobsters.getFeed(type, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_lobsters_recent', {
    description: '최신 Lobste.rs 아티클을 조회합니다 (hottest 기준).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await lobsters.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_lobsters', {
    description: 'Lobste.rs 아티클을 제목/설명 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await lobsters.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_lobsters_item', {
    description: '특정 Lobste.rs 아티클의 상세 정보(본문 + 댓글)를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('Lobste.rs short_id (예: "abc123")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await lobsters.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== Dev.to =====

  server.registerTool('get_devto_recent', {
    description: 'Dev.to의 최신 아티클을 조회합니다 (ai + programming 태그 통합).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await devto.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_devto', {
    description: 'Dev.to 아티클을 제목/요약 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await devto.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_devto_item', {
    description: '특정 Dev.to 아티클의 상세 정보(본문 + 댓글)를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('Dev.to article id (예: "3913605")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await devto.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== TLDR =====

  server.registerTool('get_tldr_recent', {
    description: 'TLDR 뉴스레터의 최신 tech 아티클을 조회합니다.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await tldr.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_tldr', {
    description: 'TLDR 아티클을 제목/요약 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await tldr.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_tldr_item', {
    description: '특정 TLDR 아티클의 상세 정보를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('TLDR story id'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await tldr.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== Papers with Code =====

  server.registerTool('get_paperswithcode_recent', {
    description: 'Papers with Code (HuggingFace)의 최신 트렌딩 논문을 조회합니다.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await paperswithcode.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_paperswithcode', {
    description: 'Papers with Code 논문을 제목/초록 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await paperswithcode.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_paperswithcode_item', {
    description: '특정 Papers with Code 논문의 상세 정보를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('Paper ID (예: "2605.23904")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await paperswithcode.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  // ===== Reddit =====

  server.registerTool('get_reddit', {
    description: '특정 서브레딧의 아티클을 조회합니다 (정렬 지정 가능).',
    inputSchema: z.object({
      subreddit: z.string().describe('서브레딧 이름 (r/ 접두사 없이, 예: "programming")'),
      sort: z.enum(['hot', 'new', 'top', 'rising']).default('hot').describe('정렬 방식'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const subreddit = args.subreddit as string;
    const sort = args.sort as string;
    const limit = args.limit as number;
    const items = await reddit.getSubreddit(subreddit, sort, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_reddit_recent', {
    description: '최신 Reddit 아티클을 조회합니다 (AI + 프로그래밍 기본 서브레딧 통합, 중복 제거).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const limit = args.limit as number;
    const items = await reddit.getRecent(limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('search_reddit', {
    description: 'Reddit 아티클을 제목/요약 기준으로 검색합니다 (in-memory 텍스트 매칭).',
    inputSchema: z.object({
      query: z.string().describe('검색어'),
      limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
    }),
  }, async (args: Record<string, unknown>) => {
    const query = args.query as string;
    const limit = args.limit as number;
    const items = await reddit.search(query, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }] };
  });

  server.registerTool('get_reddit_item', {
    description: '특정 Reddit 아티클의 상세 정보(본문 + 상위 댓글)를 조회합니다.',
    inputSchema: z.object({
      id: z.string().describe('Reddit post id (base36, 예: "1abc23")'),
    }),
  }, async (args: Record<string, unknown>) => {
    const id = args.id as string;
    const detail = await reddit.getItem(id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
  });

  return server;
}
