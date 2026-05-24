// Load .env file for local development (safe to ignore in production)
if (process.env.NODE_ENV !== 'production') {
  try {
    // Dynamic import so we don't bundle dotenv in production builds
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch {
    // dotenv not installed or no .env file — that's fine
  }
}

import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getFlightsTool } from './tools/flights/getFlights.js';
import {
  GetBulkAvailSchema,
  GetFlightsSchema,
  GetRoutesSchema,
  GetTripsSchema,
} from './schema.js';
import { getBulkAvailTool } from './tools/flights/getBulkAvail.js';
import { getRoutesTool } from './tools/flights/getRoutes.js';
import { getTripsTool } from './tools/flights/getTrips.js';

// The stdio path creates one persistent server instance and registers tools on it.
// The HTTP path creates a fresh server + transport per request inside src/server/http.ts
// (so we skip the global instance when running in HTTP mode to avoid wasted work).
const isHttpMode = process.env.MCP_TRANSPORT === 'http' || !!process.env.PORT;

if (!isHttpMode) {
  const server = new McpServer(
    {
      name: 'seats-mcp',
      version: '1.0.1',
    },
    {
      instructions: `This server provides tools to search for award flight availability through seats.aero.

Available tools:
1. get_flights: Search for specific flight routes between airports
   - Requires origin and destination airports
   - Optional filters for dates, cabin class, and carriers
   - Returns detailed flight information including pricing

2. get_bulk_avail: Search for bulk availability across regions
   - Requires a specific airline source
   - Optional filters for cabin class, dates, and regions
   - Returns available award seats for the specified airline

3. get_routes: Search for routes for a particular source
   - Requires a specific airline source

Note: All operations require a valid SEATS_API_KEY environment variable.
You should only use the tools provided by this server for flight searches.

Cabin classes available: economy, premium, business, first
Date format required: YYYY-MM-DD
Sources supported: eurobonus, virginatlantic, aeromexico, american, delta, etihad, united, emirates, aeroplan, alaska, velocity, qantas, and more.`,
    }
  );

  server.tool(
    'get_flights',
    'Get cached award flights on seats.aero.',
    GetFlightsSchema.shape,
    async (params) => {
      return await getFlightsTool(params);
    }
  );

  server.tool(
    'get_bulk_avail',
    'Find bulk availability for a particular source.',
    GetBulkAvailSchema.shape,
    async (params) => {
      return await getBulkAvailTool(params);
    }
  );

  server.tool(
    'get_routes',
    'Get routes for a particular source.',
    GetRoutesSchema.shape,
    async (params) => {
      return await getRoutesTool(params);
    }
  );

  server.tool(
    'get_trips',
    'Get detailed flight segments, taxes, and booking links for a specific availability result (use the ID returned by get_flights).',
    GetTripsSchema.shape,
    async (params) => {
      return await getTripsTool(params);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  // HTTP mode — the real server instances are created per-request in src/server/http.ts
  const { startHttpServer } = await import('./server/http.js');
  startHttpServer();
}
