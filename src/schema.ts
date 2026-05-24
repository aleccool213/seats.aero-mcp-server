import { z } from 'zod';

const CABIN_CLASSES = ['economy', 'premium', 'business', 'first'] as const;
const ORDER_BY_OPTIONS = ['', 'lowest_mileage'] as const;
const SOURCES = [
  'eurobonus',
  'virginatlantic',
  'aeromexico',
  'american',
  'delta',
  'etihad',
  'united',
  'emirates',
  'aeroplan',
  'alaska',
  'velocity',
  'qantas',
  'connectmiles',
  'azul',
  'smiles',
  'flyingblue',
  'jetblue',
  'qatar',
  'turkish',
  'singapore',
  'ethiopian',
  'saudia',
  // Added from official seats.aero Concepts table (May 2026)
  'finnair',
  'lufthansa',
  'frontier',
  'spirit',
] as const;

export const GetFlightsSchema = z.object({
  originAirport: z.string(),
  destinationAirport: z.string(),
  departureDate: z.string().optional(),
  // Legacy single-cabin param (still supported for backward compat)
  cabinClass: z.enum(CABIN_CLASSES).optional(),
  // Newer multi-cabin support (preferred when possible)
  cabins: z.string().optional(), // comma-separated, e.g. "economy,business"
  startDate: z
    .string()
    .regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
    .optional(),
  cursor: z.number().optional(),
  take: z.number().min(10).max(1000).optional(),
  order_by: z.enum(ORDER_BY_OPTIONS).optional(),
  skip: z.number().optional(),
  include_trips: z.boolean().optional(),
  minify_trips: z.boolean().optional(),
  only_direct_flights: z.boolean().optional(),
  // Fixed: was incorrectly limited to exactly 2 chars. Now allows comma lists like "DL,AA,AS"
  carriers: z.string().optional(),
  // NEW: filter to specific mileage programs (highly recommended for Aeroplan use)
  sources: z.string().optional(), // comma-separated, e.g. "aeroplan,united,delta"
  include_filtered: z.boolean().optional(),
});

export const GetBulkAvailSchema = z.object({
  source: z.enum(SOURCES),
  cabinClass: z.enum(CABIN_CLASSES).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
    .optional(),
  originRegion: z.string().optional(),
  destinationRegion: z.string().optional(),
  take: z.number().min(10).max(1000).optional(),
  skip: z.number().optional(),
  cursor: z.number().optional(),
});

export const GetRoutesSchema = z.object({
  source: z.enum(SOURCES),
});

export type CabinClass = (typeof CABIN_CLASSES)[number];
export type OrderByOption = (typeof ORDER_BY_OPTIONS)[number];
export type Source = (typeof SOURCES)[number];

// Export the runtime list so tests (and potentially tools) can introspect supported programs
export { SOURCES };

// New tool for detailed trip/segment + booking link data
export const GetTripsSchema = z.object({
  id: z.string().min(10, "Availability ID looks too short"),
  include_filtered: z.boolean().optional(),
});
