import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { GeekNewsSource } from './sources/geeknews.js';
import type { FeedType } from './types.js';

export function createServer(): McpServer {
  const source = new GeekNewsSource();
  const server = new McpServer({
    name: 'harness-feed-mcp',
    version: '0.1.0',
  });

  // get_feed
  server.registerTool(
    'get_feed',
    {
      description: '카테고리별 GeekNews 아티클을 조회합니다.',
      inputSchema: z.object({
        type: z.enum(['top', 'new', 'ask', 'show']).describe('피드 타입'),
        limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
      }),
    },
    async (args: Record<string, unknown>) => {
      const type = args.type as string;
      const limit = args.limit as number;
      const items = await source.getFeed(type as FeedType, limit);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  // get_recent_feed
  server.registerTool(
    'get_recent_feed',
    {
      description: '최신 GeekNews 아티클을 조회합니다 (top + new 통합, 중복 제거).',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
      }),
    },
    async (args: Record<string, unknown>) => {
      const limit = args.limit as number;
      const items = await source.getRecent(limit);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  // search_feed
  server.registerTool(
    'search_feed',
    {
      description: 'GeekNews 아티클을 제목/요약 기준으로 검색합니다 (in-memory 텍스트 매칭).',
      inputSchema: z.object({
        query: z.string().describe('검색어'),
        limit: z.number().int().min(1).max(100).default(20).describe('반환할 최대 개수'),
      }),
    },
    async (args: Record<string, unknown>) => {
      const query = args.query as string;
      const limit = args.limit as number;
      const items = await source.search(query, limit);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  // get_weekly
  server.registerTool(
    'get_weekly',
    {
      description: '주간 GeekNews Weekly 다이제스트를 조회합니다.',
      inputSchema: z.object({
        weeklyId: z.string().optional().describe('주간 ID (없으면 최신)'),
      }),
    },
    async (args: Record<string, unknown>) => {
      const weeklyId = args.weeklyId as string | undefined;
      const digest = await source.getWeekly(weeklyId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(digest, null, 2) }],
      };
    },
  );

  // get_item
  server.registerTool(
    'get_item',
    {
      description: '특정 GeekNews 아티클의 상세 정보(본문 + 댓글)를 조회합니다.',
      inputSchema: z.object({
        id: z.string().describe('GeekNews topic id (예: "30554")'),
      }),
    },
    async (args: Record<string, unknown>) => {
      const id = args.id as string;
      const detail = await source.getItem(id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }],
      };
    },
  );

  return server;
}
