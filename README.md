# @kimduumin/harness-feed-mcp

[![npm version](https://img.shields.io/npm/v/@kimduumin/harness-feed-mcp.svg)](https://www.npmjs.com/package/@kimduumin/harness-feed-mcp)
[![GitHub Repository](https://img.shields.io/badge/GitHub-doominkim%2Fharness--feed--mcp-181717?logo=github)](https://github.com/doominkim/harness-feed-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

하네스(subagent) 설계와 관리에 참고할 최신 기술 피드를 구조화된 JSON으로 제공하는 MCP 서버입니다.

- `npx -y @kimduumin/harness-feed-mcp@latest`로 stdio 실행
- 별도 서버 배포 없이 tool 호출 시점에만 외부 소스에 HTTP 요청
- GeekNews, Hacker News, arXiv, Lobste.rs, Dev.to, TLDR, Papers with Code 등 7개 소스 지원

## 사용 예시

MCP client에서 다음과 같은 요청을 처리할 수 있습니다.

```text
최근 GeekNews 기사 중에서 "kimi" 검색해줘
```

```text
Hacker News top 스토리 10개 보여줘
```

```text
arXiv에서 "RLHF" 관련 최신 논문 찾아줘
```

```text
Lobste.rs에서 가장 핫한 글 5개 알려줘
```

## 소스

| 소스 | 상태 | 설명 |
| --- | --- | --- |
| [GeekNews](https://news.hada.io) | ✅ | 한국 개발/기술/스타트업 뉴스 큐레이션 |
| [Hacker News](https://news.ycombinator.com) | ✅ | Y Combinator 기술 뉴스 커뮤니티 |
| [arXiv](https://arxiv.org) | ✅ | 논문 프리프린트 (cs.AI, cs.CL 등) |
| [Lobste.rs](https://lobste.rs) | ✅ | 초대제 기술 커뮤니티 |
| [Dev.to](https://dev.to) | ✅ | 개발자 커뮤니티, 태그 기반 큐레이션 |
| [TLDR](https://tldr.tech) | ✅ | 일일 기술 뉴스 요약 |
| [Papers with Code](https://paperswithcode.com) | ✅ | 논문 + 구현 코드 연동 |

## 제공 도구

| 소스 | 도구 |
| --- | --- |
| GeekNews | `get_feed`, `get_recent_feed`, `search_feed`, `get_weekly`, `get_item` |
| Hacker News | `get_hackernews`, `get_hackernews_recent`, `search_hackernews`, `get_hackernews_item` |
| arXiv | `get_arxiv_recent`, `search_arxiv`, `get_arxiv_item` |
| Lobste.rs | `get_lobsters`, `get_lobsters_recent`, `search_lobsters`, `get_lobsters_item` |
| Dev.to | `get_devto_recent`, `search_devto`, `get_devto_item` |
| TLDR | `get_tldr_recent`, `search_tldr`, `get_tldr_item` |
| Papers with Code | `get_paperswithcode_recent`, `search_paperswithcode`, `get_paperswithcode_item` |

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
