import { describe, it, expect } from 'vitest';
import {
  GetFlightsSchema,
  GetTripsSchema,
  SOURCES,
  GetBulkAvailSchema,
  GetRoutesSchema,
} from '../src/schema';

describe('Schema updates for remote MCP + Aeroplan use', () => {
  it('includes the four newly added sources from the official seats.aero docs', () => {
    expect(SOURCES).toContain('finnair');
    expect(SOURCES).toContain('lufthansa');
    expect(SOURCES).toContain('frontier');
    expect(SOURCES).toContain('spirit');
    expect(SOURCES).toContain('aeroplan'); // sanity
  });

  describe('GetFlightsSchema', () => {
    it('accepts the new multi-program sources filter', () => {
      const result = GetFlightsSchema.safeParse({
        originAirport: 'YYZ',
        destinationAirport: 'LHR',
        sources: 'aeroplan,united',
      });
      expect(result.success).toBe(true);
    });

    it('accepts cabins (plural) in addition to legacy cabinClass', () => {
      const result = GetFlightsSchema.safeParse({
        originAirport: 'SFO',
        destinationAirport: 'NRT',
        cabins: 'business,first',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minify_trips and include_filtered', () => {
      const result = GetFlightsSchema.safeParse({
        originAirport: 'YUL',
        destinationAirport: 'CDG',
        minify_trips: true,
        include_filtered: false,
      });
      expect(result.success).toBe(true);
    });

    it('no longer incorrectly restricts carriers to exactly 2 characters', () => {
      const result = GetFlightsSchema.safeParse({
        originAirport: 'LAX',
        destinationAirport: 'JFK',
        carriers: 'DL,AA,AS',
      });
      expect(result.success).toBe(true);
      expect(result.data?.carriers).toBe('DL,AA,AS');
    });

    it('still works with the original minimal fields (backward compat)', () => {
      const result = GetFlightsSchema.safeParse({
        originAirport: 'EWR',
        destinationAirport: 'LHR',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('GetTripsSchema', () => {
    it('requires a non-trivial id', () => {
      const bad = GetTripsSchema.safeParse({ id: 'short' });
      expect(bad.success).toBe(false);

      const good = GetTripsSchema.safeParse({ id: '2S8Cm9dHORWWKpoCkxfRkZa0e5l' });
      expect(good.success).toBe(true);
    });

    it('accepts optional include_filtered', () => {
      const result = GetTripsSchema.safeParse({
        id: '2S8Cm9dHORWWKpoCkxfRkZa0e5l',
        include_filtered: true,
      });
      expect(result.success).toBe(true);
    });
  });

  it('existing schemas (bulk + routes) continue to work', () => {
    expect(GetBulkAvailSchema.safeParse({ source: 'aeroplan' }).success).toBe(true);
    expect(GetRoutesSchema.safeParse({ source: 'delta' }).success).toBe(true);
  });
});
