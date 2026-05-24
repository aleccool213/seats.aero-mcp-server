import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFlightsTool } from '../../src/tools/flights/getFlights';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('getFlightsTool – new parameter forwarding', () => {
  it('forwards sources, cabins, and the other new fields to the seats.aero API', async () => {
    process.env.SEATS_API_KEY = 'dummy';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    global.fetch = mockFetch as any;

    await getFlightsTool({
      originAirport: 'YYZ',
      destinationAirport: 'LHR',
      sources: 'aeroplan',
      cabins: 'business,first',
      minify_trips: true,
      include_filtered: true,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const params = new URL(calledUrl).searchParams;

    expect(params.get('sources')).toBe('aeroplan');
    expect(params.get('cabins')).toBe('business,first');
    expect(params.get('minify_trips')).toBe('true');
    expect(params.get('include_filtered')).toBe('true');
  });

  it('no longer forces a bad order_by value', async () => {
    process.env.SEATS_API_KEY = 'dummy';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = mockFetch as any;

    await getFlightsTool({
      originAirport: 'SFO',
      destinationAirport: 'EWR',
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const params = new URL(calledUrl).searchParams;

    // We should NOT see order_by=price anymore
    expect(params.get('order_by')).not.toBe('price');
  });
});
