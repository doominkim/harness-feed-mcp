const USER_AGENT = 'harness-feed-mcp/0.1.0';

/**
 * URL에서 HTML을 fetch합니다.
 */
export async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }

  return response.text();
}
