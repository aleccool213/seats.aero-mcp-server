import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createHttpServer } from '../../src/server/http';

const originalEnv = { ...process.env };

describe('HTTP transport + auth (the remote MCP surface for Grok)', () => {
  let app: ReturnType<typeof createHttpServer>;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('/healthz always works and reports streamable-http', async () => {
    app = createHttpServer();
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      transport: 'streamable-http',
      stateless: true,
    });
  });

  it('returns 401 on /mcp when MCP_AUTH_TOKEN is set and no valid token is sent', async () => {
    process.env.MCP_AUTH_TOKEN = 'super-secret-token';

    app = createHttpServer();

    const res = await request(app)
      .post('/mcp')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('allows tools/list when the correct bearer token is provided', async () => {
    process.env.MCP_AUTH_TOKEN = 'my-grok-token';
    // We don't need a real SEATS key for tools/list
    delete process.env.SEATS_API_KEY;

    app = createHttpServer();

    const res = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer my-grok-token')
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 99,
        method: 'tools/list',
        params: {},
      });

    expect(res.status).toBe(200);

    // The response comes as SSE-style "event: message\ndata: {...}"
    const body = res.text;
    expect(body).toContain('get_flights');
    expect(body).toContain('get_trips'); // the new tool must appear
    expect(body).toContain('get_bulk_avail');
  });

  it('still works (no auth) when MCP_AUTH_TOKEN is not configured at all (dev convenience)', async () => {
    delete process.env.MCP_AUTH_TOKEN;

    app = createHttpServer();

    const res = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('get_routes');
  });
});
