[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

# seats.aero MCP server

## Not affiliated with seats.aero

A TypeScript-based, minimal MCP server for interacting with the seats.aero API via Claude desktop or any other MCP clients in natural language.

❗ You will need a seats.aero API key via a seats.aero Pro membership in order to use this tool

### Setup

Install dependencies
`pnpm i`

Build and compile TypeScript
`pnpm build`

Start MCP server
`pnpm start`

### Config

You will need to add your MCP server config to your `claude_desktop_config.json` file or whatever your MCP client of choice is.

```json
"seats": {
  "command": "node",
  "args": ["/Users/USER/Sites/seats-mcp/build/index.js"],
  "env": {
    "SEATS_API_KEY": "SEATS_API_KEY"
  }
}
```

### Tools available

`get_flights`
Get a list of flights. Your MCP client will be able to search via the same parameters as the [cached search endpoint](https://developers.seats.aero/reference/cached-search)

`get_bulk_avail`
Retrieve a large amount of availability objects from one specific mileage program (source). Your MCP client will be able to search via the same parameters as the [bulk availability endpoint](https://developers.seats.aero/reference/get-availability)

`get_routes`
Retrieve a list of route objects from one specific mileage program (source). Your MCP client will be able to search via the same parameters as the [routes endpoint](https://developers.seats.aero/reference/get-routes-1).

`get_trips`
Get detailed flight segments, taxes, remaining seats, and **booking links** for a specific availability result returned by `get_flights`. Use the `ID` from the search results.

---

## Development

### Local Development

```bash
pnpm install
pnpm build
```

Run in stdio mode (for Claude Desktop, Cursor, etc.):

```bash
SEATS_API_KEY=your_seats_aero_key pnpm start
```

Run in HTTP mode (for remote connectors like Grok):

```bash
MCP_TRANSPORT=http \
MCP_AUTH_TOKEN=your-secret-token \
SEATS_API_KEY=your_seats_aero_key \
pnpm start:http
```

The server will listen on port 3000 by default (or `PORT` env var).

### Testing

```bash
# Watch mode during development
pnpm test

# One-shot run (recommended before committing)
pnpm test:run
```

All tests must pass. The suite covers:
- Schema validation (including new `sources`, `cabins`, etc.)
- Tool logic and error handling
- Remote HTTP transport + bearer token authentication

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on contributing.

---

## Remote Usage with Grok (Recommended)

This server is designed to be hosted and used via **Grok's Remote MCP** feature.

### 1. Deploy

We provide ready-to-use configuration for the easiest cheap platforms:

| Platform     | File            | Approx. Cost     | Notes                              |
|--------------|-----------------|------------------|------------------------------------|
| **Render**   | `render.yaml`   | $7/mo (Starter) or free | One-click deploy, easiest for beginners |
| **Fly.io**   | `fly.toml`      | ~$2–5/mo        | Very flexible, good free allowance |
| Any Docker   | `Dockerfile`    | Varies          | Works on Railway, VPS, etc.        |

**Quick Render deploy** (recommended):
1. Push your code to GitHub
2. In Render → "New Web Service" → connect your repo
3. It will auto-detect `render.yaml`
4. Set the two secrets:
   - `SEATS_API_KEY`
   - `MCP_AUTH_TOKEN` (pick a strong random string)

The improved `Dockerfile` now includes:
- Proper healthcheck (`/healthz`)
- Support for both stdio and HTTP mode
- Non-root user + small image
- Respects `$PORT` and `$MCP_TRANSPORT`

The included `Dockerfile` supports both stdio and HTTP modes via environment variables.

### 2. Configure in Grok

When calling the xAI API (or using Grok's custom tools interface), add the remote MCP like this:

```json
{
  "tools": [
    {
      "type": "mcp",
      "server_url": "https://your-seats-mcp.onrender.com/mcp",
      "server_label": "seats-aero",
      "server_description": "Award flight availability search across 25+ mileage programs including Aeroplan",
      "authorization": "Bearer your-secret-token-here",
      "allowed_tools": ["get_flights", "get_trips", "get_bulk_avail"]
    }
  ]
}
```

- `server_url` → Your deployed `/mcp` endpoint (must use HTTPS)
- `authorization` → The value of `MCP_AUTH_TOKEN` on your server
- `allowed_tools` → Recommended to limit scope

Once configured, you can ask Grok things like:

> "Find me the best business class award space on Aeroplan from YYZ to LHR or CDG in the next 60 days under 65,000 miles. Show me booking links."

Grok will call your server on your behalf.

---

## Environment Variables

### Local Development

Copy the example file and fill it in:

```bash
cp .env.example .env
# Then edit .env with your real keys
```

Or just export them in your shell:

```bash
export SEATS_API_KEY=your_real_key
export MCP_AUTH_TOKEN=dev-token-for-local-testing
MCP_TRANSPORT=http pnpm start:http
```

We automatically load `.env` (via `dotenv`) when `NODE_ENV` is not `production`.

### Production (Render, Fly, Railway, etc.)

**Never** put real secrets in `render.yaml`, `fly.toml`, or committed files.

Instead, set them as **environment variables** in your hosting platform's dashboard:

- `SEATS_API_KEY` → Your real seats.aero Pro API key
- `MCP_AUTH_TOKEN` → A strong secret token (generate with `openssl rand -hex 32` or similar). This is what you will put in Grok's `authorization` field.

Example for Render:
- Go to your service → Environment
- Add the two keys above (mark them as secret if the UI offers it)

| Variable            | Required | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `SEATS_API_KEY`     | Yes      | Your seats.aero Partner API key (Pro account)    |
| `MCP_AUTH_TOKEN`    | No*      | Bearer token required to call the HTTP endpoint  |
| `PORT`              | No       | Port for HTTP mode (platforms usually set this)  |
| `MCP_TRANSPORT`     | No       | Set to `http` when deploying for remote use      |

\* Strongly recommended when exposing the server publicly.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, testing, and contribution guidelines.

We especially welcome improvements to:
- Tool ergonomics for natural language award searches
- Response formatting (summaries instead of raw JSON)
- Additional mileage programs / filters
- Deployment examples

---

## License

MPL-2.0 – see [LICENSE](LICENSE) file.
