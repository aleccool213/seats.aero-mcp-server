import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTripsTool } from '../../src/tools/flights/getTrips';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('getTripsTool (new tool for booking links & segments)', () => {
  it('returns a clear error when SEATS_API_KEY is missing', async () => {
    delete process.env.SEATS_API_KEY;

    const result = await getTripsTool({ id: '2S8Cm9dHORWWKpoCkxfRkZa0e5l' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SEATS_API_KEY');
  });

  it('calls the correct seats.aero /trips/{id} endpoint', async () => {
    process.env.SEATS_API_KEY = 'test-key-123';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ ID: 'trip1', Cabin: 'business' }] }),
    });
    global.fetch = mockFetch as any;

    await getTripsTool({ id: 'abc123def456' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://seats.aero/partnerapi/trips/abc123def456'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Partner-Authorization': 'test-key-123',
        }),
      })
    );
  });

  it('passes include_filtered when requested', async () => {
    process.env.SEATS_API_KEY = 'test-key-123';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = mockFetch as any;

    await getTripsTool({ id: 'someid', include_filtered: true });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('include_filtered=true');
  });

  it('surfaces API errors nicely', async () => {
    process.env.SEATS_API_KEY = 'test-key-123';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    }) as any;

    const result = await getTripsTool({ id: 'badid' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('404');
  });
});
