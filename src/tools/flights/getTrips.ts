import { z } from 'zod';
import { GetTripsSchema } from '../../schema.js';

type GetTripsParams = z.infer<typeof GetTripsSchema>;

export async function getTripsTool(args: GetTripsParams) {
  try {
    const { id, include_filtered = false } = args;

    if (!process.env.SEATS_API_KEY) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: SEATS_API_KEY environment variable is not set',
          },
        ],
        isError: true,
      };
    }

    const queryParams = new URLSearchParams();
    if (include_filtered) queryParams.append('include_filtered', 'true');

    const url = `https://seats.aero/partnerapi/trips/${encodeURIComponent(id)}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'Partner-Authorization': process.env.SEATS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error with seats.aero API (${response.status}): ${errorText}`,
          },
        ],
        isError: true,
      };
    }

    const data = await response.json();

    if (!data) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No trip details found for availability ID ${id}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Trip details for ${id}:\n\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching trip details: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
      isError: true,
    };
  }
}
