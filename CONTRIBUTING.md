# Contributing to seats.aero MCP Server

Thank you for your interest in contributing! This is a small, focused project for making award flight search available to AI agents (especially Grok via remote MCP).

## Development Setup

1. **Prerequisites**
   - Node.js 20+
   - pnpm (the project uses pnpm 9)

2. **Clone and install**
   ```bash
   git clone https://github.com/YOUR-USERNAME/seats.aero-mcp-server.git
   cd seats.aero-mcp-server
   pnpm install
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Run locally (stdio mode - for Claude Desktop etc.)**
   ```bash
   SEATS_API_KEY=your_key_here pnpm start
   ```

5. **Run in HTTP mode (for remote use with Grok)**
   ```bash
   MCP_TRANSPORT=http \
   MCP_AUTH_TOKEN=your-secret-token \
   SEATS_API_KEY=your_key_here \
   pnpm start:http
   ```

## Testing

We have automated tests covering the schema changes, new tools, parameter handling, and the remote HTTP transport.

```bash
# Watch mode (recommended during development)
pnpm test

# One-shot run (use this before opening a PR)
pnpm test:run
```

All tests must pass before merging.

## Making Changes

- The main entry point is `src/index.ts`
- New tools go in `src/tools/flights/`
- Schema changes live in `src/schema.ts`
- The remote HTTP server logic is in `src/server/http.ts`

When adding or modifying tools:
- Update the Zod schema in `src/schema.ts`
- Implement the tool function
- Register it in **both** `src/index.ts` (stdio) **and** `src/server/http.ts` (HTTP) — or better, extract a shared `registerTools()` helper if you add many more.
- Add or update tests in `test/`

## Remote MCP (Grok) Considerations

This project is primarily maintained to be used as a **remote MCP server** via Grok's custom connector feature.

When changing the HTTP layer (`src/server/http.ts`):
- Keep it stateless (`sessionIdGenerator: undefined`)
- Preserve the simple bearer token auth (`MCP_AUTH_TOKEN`)
- Make sure `/healthz` and the `/mcp` POST endpoint continue to work
- Add tests in `test/server/http.test.ts`

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes + add tests
3. Run `pnpm test:run` locally and ensure everything is green
4. Open a PR — CI will also run the full build + test suite
5. Keep PRs focused and reasonably small

## Code Style

- TypeScript strict mode is enabled — keep it that way
- Prefer clear error messages returned in the MCP `content` format
- The project aims to stay minimal — resist adding heavy dependencies unless they are truly necessary

## Questions?

Open an issue or start a discussion. We're happy to help you contribute successfully.

Thanks for helping make award travel search better for AI agents!
