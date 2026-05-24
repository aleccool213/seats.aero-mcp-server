import express, { Request, Response, NextFunction } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GetBulkAvailSchema, GetFlightsSchema, GetRoutesSchema, GetTripsSchema } from '../schema.js';
import { getBulkAvailTool } from '../tools/flights/getBulkAvail.js';
import { getFlightsTool } from '../tools/flights/getFlights.js';
import { getRoutesTool } from '../tools/flights/getRoutes.js';
import { getTripsTool } from '../tools/flights/getTrips.js';

// Simple bearer token auth middleware.
// The token the user puts in Grok's "authorization" field must match process.env.MCP_AUTH_TOKEN (or we skip auth if not set).
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.MCP_AUTH_TOKEN;
  if (!configured) {
    return next(); // no protection configured (dev / local only)
  }

  const header = req.headers.authorization || '';
  // Accept either "Bearer <token>" or just the raw token value (Grok docs are flexible)
  const provided = header.startsWith('Bearer ') ? header.slice(7) : header;

  if (provided !== configured) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing MCP_AUTH_TOKEN' });
    return;
  }
  next();
}

export function createHttpServer() {
  const app = express();

  // Standard middleware for MCP over HTTP
  app.use(express.json({ limit: '4mb' }));

  // Health check for PaaS / load balancers / humans
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', transport: 'streamable-http', stateless: true });
  });

  // The single MCP endpoint that Grok will call.
  // We use stateless mode (no sessionId) so every request is independent — exactly like a normal REST call.
  app.post('/mcp', authMiddleware, async (req: Request, res: Response) => {
    try {
      // Create a fresh server + transport for this request (stateless = simple & safe)
      const server = new McpServer(
        { name: 'seats-mcp', version: '1.1.0' },
        {
          instructions: `This server provides tools to search for award flight availability through seats.aero (Partner API).

You are talking to a **remote** instance that holds the SEATS_API_KEY server-side.

Key tools:
- get_flights: main cached search. Pass sources: "aeroplan" (or comma list) to limit to specific programs. Supports cabins, date ranges, carriers, etc.
- get_trips: given an availability ID from get_flights, returns full segments + booking links (the actual "book now" URLs on the airline site).
- get_bulk_avail + get_routes: for broad exploration.

All date formats are YYYY-MM-DD. Cabin classes: economy, premium, business, first.

When the user mentions Aeroplan points or Air Canada Aeroplan, always include sources: "aeroplan" (or add it to an existing list) unless they explicitly want other programs too.`,
        }
      );

      // Register the three original tools (same registration as the stdio path)
      server.tool('get_flights', 'Get cached award flights on seats.aero.', GetFlightsSchema.shape, async (params) => {
        return await getFlightsTool(params);
      });

      server.tool('get_bulk_avail', 'Find bulk availability for a particular source.', GetBulkAvailSchema.shape, async (params) => {
        return await getBulkAvailTool(params);
      });

      server.tool('get_routes', 'Get routes for a particular source.', GetRoutesSchema.shape, async (params) => {
        return await getRoutesTool(params);
      });

      server.tool(
        'get_trips',
        'Get detailed flight segments, taxes, and booking links for a specific availability result (use the ID returned by get_flights).',
        GetTripsSchema.shape,
        async (params) => {
          return await getTripsTool(params);
        }
      );

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — every POST stands alone
      });

      await server.connect(transport);

      // Let the transport handle the JSON-RPC request/response (and SSE if the client negotiates it)
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP HTTP error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id ?? null,
          error: { code: -32603, message: 'Internal server error' },
        });
      }
    }
  });

  // Helpful GET for humans who hit the endpoint in a browser
  app.get('/mcp', (_req, res) => {
    res.status(405).send('MCP endpoint only accepts POST (JSON-RPC). Use a proper MCP client (Grok remote MCP, Inspector, etc.).');
  });

  return app;
}

export function startHttpServer(port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000) {
  const app = createHttpServer();
  const server = app.listen(port, () => {
    console.log(`seats-mcp HTTP server listening on port ${port}`);
    console.log(`  POST http://localhost:${port}/mcp   (MCP over Streamable HTTP)`);
    console.log(`  GET  http://localhost:${port}/healthz`);
    if (process.env.MCP_AUTH_TOKEN) {
      console.log('  Bearer token auth is ENABLED (MCP_AUTH_TOKEN is set)');
    } else {
      console.log('  WARNING: No MCP_AUTH_TOKEN set — the endpoint is open (dev only)');
    }
  });

  // Graceful shutdown for PaaS
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down HTTP server...');
    server.close(() => process.exit(0));
  });

  return server;
}
