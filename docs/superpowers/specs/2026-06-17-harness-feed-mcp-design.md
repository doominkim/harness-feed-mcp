# harness-feed-mcp 설계 문서

- 작성일: 2026-06-17
- 상태: 승인됨

## 1. 개요

`harness-feed-mcp`는 하네스(subagent) 설계와 관리에 참고할 최신 기술 피드를
구조화된 JSON으로 제공하는 MCP server 어댑터이다.

- `npx -y harness-feed-mcp`로 stdio 실행
- 별도 서버 배포 없음, background scheduler 없음, 기본 디스크 캐시 없음
- tool 호출 시점에만 외부 source에 HTTP 요청
- 초기 데이터 소스: GeekNews (`news.hada.io`)
- 향후 arXiv, Hacker News, Papers with Code 등 adapter 추가 가능

## 2. 사용자 시나리오

### 2.1 harness-auditor 자동화

harness-auditor가 주기적으로 모델 동향을 감지하고 opencode.json의 subagent를
자동 관리하는 워크플로우:

```
1. get_recent_feed(20) → 최근 20개 GeekNews 기사 조회 (top 페이지)
2. search_feed("kimi k2.7") → 제목/요약에 "kimi k2.7"이 포함된 기사만 필터링
3. get_item("30554") → 해당 기사 상세 + 댓글 확인
4. 변경 근거 확보 → opencode.json 수정 제안
```

### 2.2 수동 참조

사용자가 직접 LLM에게 요청:

> "이번 주 AI 에이전트 관련 GeekNews 글 중에서 하네스 설계에 참고할 만한 것만 모아줘."

## 3. MCP Tools

| 도구 | 설명 | 파라미터 | 반환 | 구현 방식 |
|---|---|---|---|---|
| `get_feed` | 카테고리별 아티클 | `type: "top"\|"new"\|"ask"\|"show"`, `limit?: number` (기본 20) | `Reference[]` | GeekNews HTML 파싱 |
| `get_recent_feed` | 최신 아티클 | `limit?: number` (기본 20) | `Reference[]` | `get_feed("top")` + `get_feed("new")`를 합치고 중복 제거 후 최신순 정렬 |
| `search_feed` | 제목/요약 기준 검색 | `query: string`, `limit?: number` (기본 20) | `Reference[]` | `get_recent_feed(100)` → in-memory 텍스트 매칭 (대소문자 무시) |
| `get_weekly` | 주간 다이제스트 | `weeklyId?: string` (없으면 최신) | `WeeklyDigest` | GeekNews 주간 HTML 파싱 |
| `get_item` | 특정 아티클 상세 | `id: string` | `ReferenceDetail` | `topic?id=...` 페이지 파싱 |

> **`search_feed` 구현 제약**: GeekNews의 검색 페이지( `/search?q=...`)는 JS 렌더링이 필요하여
> 일반 HTTP GET만으로 결과를 추출할 수 없다. 따라서 MVP에서는 `get_recent_feed`로
> 충분히 많은 항목(최대 100개)을 가져온 후 in-memory에서 제목/요약 텍스트 매칭으로
> 필터링한다. 향후 Brave Search나 다른 검색 API를 사용하는 방식으로 업그레이드 가능.

## 4. 공통 JSON Schema

### 4.1 Reference

```typescript
interface Reference {
  id: string;           // GeekNews topic id (e.g. "30554")
  title: string;        // 기사 제목
  url: string;          // 원문 링크
  summary: string;      // GeekNews 요약 텍스트
  source: string;       // "geeknews" (고정)
  publishedAt: string;  // 상대 시간 (e.g. "22시간전")
  pointCount: number;   // 추천 수
  commentCount: number; // 댓글 수
}
```

### 4.2 WeeklyDigest

```typescript
interface WeeklyDigest {
  id: string;
  title: string;
  url: string;
  items: Reference[];
}
```

### 4.3 ReferenceDetail

```typescript
interface ReferenceDetail extends Reference {
  content: string;      // 본문 전문
  comments: Comment[];  // 댓글 목록
}

interface Comment {
  author: string;
  text: string;
  publishedAt: string;
}
```

## 5. 아키텍처

```
┌─────────────────────────────────────────┐
│ MCP Client (Claude/OpenCode)            │
│   └─ harness-auditor                    │
└───────────────┬─────────────────────────┘
                │ stdio JSON-RPC
┌───────────────▼─────────────────────────┐
│ harness-feed-mcp                        │
│   src/index.ts          (entry)         │
│   src/server.ts         (FastMCP)       │
│   src/types.ts          (schema)        │
│   src/fetcher.ts        (HTTP)          │
│   src/parsers/                         │
│     geeknews-parser.ts  (HTML→Reference)│
│   src/sources/                         │
│     geeknews.ts         (adapter)       │
└───────────────┬─────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────┐
│ news.hada.io                            │
└─────────────────────────────────────────┘
```

## 6. 기술 스택

| 항목 | 선택 |
|---|---|
| Runtime | Node.js ≥ 18 |
| 언어 | TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk` (FastMCP) |
| HTML 파싱 | `cheerio` |
| HTTP | built-in `fetch` |
| 배포 | npm (`npx -y harness-feed-mcp`) |
| 번들 | tsc 또는 tsx |

## 7. 캐시 정책

- 기본: 캐시 없음 (tool 호출마다 GeekNews fetch)
- opt-in: `HARNESS_FEED_CACHE_TTL_SECONDS` env로 in-memory 캐시 활성화
- 프로세스 종료 시 캐시 소멸 (디스크 캐시 없음)

## 8. npm 배포

```json
{
  "name": "harness-feed-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "harness-feed-mcp": "./dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "cheerio": "^1.x"
  }
}
```

## 9. 확장 설계

향후 source adapter 추가를 위한 공통 인터페이스:

```typescript
interface FeedSource {
  readonly name: string;
  search(query: string): Promise<Reference[]>;
  getRecent(limit: number): Promise<Reference[]>;
  getFeed?(type: string, limit: number): Promise<Reference[]>;
  getWeekly?(): Promise<WeeklyDigest>;
  getItem?(id: string): Promise<ReferenceDetail>;
}
```

GeekNewsSource가 첫 구현체. 이후 `ArxivSource`, `HackerNewsSource` 등 추가.

초기 MVP에서는 `sources` 파라미터 없이 GeekNews만 제공.
`list_sources` 도구도 초기 MVP에서는 생략.

## 10. 제약사항

- GeekNews HTML 구조에 의존하므로, 사이트 구조 변경 시 파서 업데이트 필요
- `npx -y`로 실행 시 매번 `@modelcontextprotocol/sdk` 의존성 설치 (`-y` 플래그 필요)
- GeekNews 검색 페이지는 JS 렌더링 필요 → MVP 검색은 in-memory 텍스트 매칭 사용
