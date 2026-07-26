/**
 * Google Maps raw place shape (mock / future Places API).
 * Normalized output stays on NormalizedBusinessResult.
 */

export type GoogleMapsOpeningHours = {
  openNow?: boolean;
  weekdayText: string[];
};

export type GoogleMapsPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  street?: string | null;
  postalCode?: string | null;
  city: string;
  region?: string | null;
  countryCode: string;
  websiteUri?: string | null;
  internationalPhoneNumber?: string | null;
  nationalPhoneNumber?: string | null;
  primaryType?: string | null;
  types: string[];
  rating?: number | null;
  userRatingCount?: number | null;
  latitude: number;
  longitude: number;
  openingHours?: GoogleMapsOpeningHours | null;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  googleMapsUri: string;
};

export type GoogleMapsSearchMockResponse = {
  status: "OK" | "ZERO_RESULTS" | "MOCK";
  query: string;
  results: GoogleMapsPlace[];
  nextPageToken: string | null;
};

export type GoogleMapsDetailsMockResponse = {
  status: "OK" | "NOT_FOUND" | "MOCK";
  result: GoogleMapsPlace | null;
};
