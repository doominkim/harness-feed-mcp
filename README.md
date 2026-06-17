# @kimduumin/harness-feed-mcp

[![npm version](https://img.shields.io/npm/v/@kimduumin/harness-feed-mcp.svg)](https://www.npmjs.com/package/@kimduumin/harness-feed-mcp)
[![GitHub Repository](https://img.shields.io/badge/GitHub-doominkim%2Fharness--feed--mcp-181717?logo=github)](https://github.com/doominkim/harness-feed-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

하네스(subagent) 설계와 관리에 참고할 최신 기술 피드를 구조화된 JSON으로 제공하는 MCP 서버입니다.

- `npx -y @kimduumin/harness-feed-mcp@latest`로 stdio 실행
- 별도 서버 배포 없이 tool 호출 시점에만 외부 소스에 HTTP 요청
- 데이터 소스: GeekNews (`news.hada.io`)

## 사용 예시

MCP client에서 다음과 같은 요청을 처리할 수 있습니다.

```text
이번 주 AI 에이전트 관련 GeekNews 글 중에서 하네스 설계에 참고할 만한 것만 모아줘
```

```text
최근 20개 GeekNews 기사 중에서 "kimi" 검색해줘
```

```text
30554번 기사 상세 내용과 댓글을 확인해줘
```

## 주요 기능

| 카테고리 | 제공 기능 |
| --- | --- |
| Feed | 카테고리별 아티클 조회 (`top`/`new`/`ask`/`show`) |
| Recent | 최신 아티클 통합 조회 (top + new 중복 제거) |
| Search | 제목/요약 기준 in-memory 텍스트 검색 |
| Weekly | 주간 GeekNews 다이제스트 조회 |
| Detail | 아티클 상세 (본문 + 댓글) 조회 |

## 소스

| 소스 | 상태 | 설명 |
| --- | --- | --- |
| [GeekNews](https://news.hada.io) | ✅ 제공 중 | 한국 개발/기술/스타트업 뉴스 큐레이션 |
| [arXiv](https://arxiv.org) | 📋 예정 | 논문 프리프린트 (cs.AI, cs.CL 등) |
| [Hacker News](https://news.ycombinator.com) | 📋 예정 | Y Combinator 기술 뉴스 커뮤니티 |
| [Papers with Code](https://paperswithcode.com) | 📋 예정 | 논문 + 구현 코드 연동 플랫폼 |


## 제공 도구

- `get_feed` — 카테고리별 GeekNews 아티클 조회
- `get_recent_feed` — 최신 아티클 조회 (top + new 통합, 중복 제거)
- `search_feed` — 제목/요약 기준 검색 (in-memory 텍스트 매칭)
- `get_weekly` — 주간 GeekNews Weekly 다이제스트 조회
- `get_item` — 특정 아티클 상세 정보 (본문 + 댓글)

## Repository

- GitHub: [https://github.com/doominkim/harness-feed-mcp](https://github.com/doominkim/harness-feed-mcp)

## 사전 요구사항

- Node.js 18 이상

## 설치

### npx 사용 권장

별도 clone 없이 MCP client가 `npx`로 바로 실행할 수 있습니다.

```bash
npx -y @kimduumin/harness-feed-mcp@latest
```

이 명령은 MCP stdio server를 시작합니다. 정상 실행 시 터미널에 아무 출력 없이 대기할 수 있습니다.

### 소스에서 빌드

```bash
git clone git@github.com:doominkim/harness-feed-mcp.git
cd harness-feed-mcp
npm install
npm run build
```

## MCP client 설정

### OpenCode

`~/.config/opencode/opencode.json`에 추가:

```json
{
  "mcp": {
    "harness-feed": {
      "type": "local",
      "command": ["npx", "-y", "@kimduumin/harness-feed-mcp@latest"],
      "enabled": true,
      "timeout": 60000
    }
  }
}
```

### 일반 MCP 설정 형태

```json
{
  "mcpServers": {
    "harness-feed": {
      "command": "npx",
      "args": ["-y", "@kimduumin/harness-feed-mcp@latest"]
    }
  }
}
```

## License

[MIT](./LICENSE)
