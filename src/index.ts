#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from './server.js';

async function main(): Promise<void> {
  // MCP SDK 1.x does not expose StdioServerTransport via package.json exports.
  // Import directly using absolute file path to bypass exports restriction.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const stdioPath = join(
    __dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk',
    'dist', 'esm', 'server', 'stdio.js',
  );

  const stdioMod = await import(stdioPath);
  const { StdioServerTransport } = stdioMod as {
    StdioServerTransport: new () => unknown;
  };

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
