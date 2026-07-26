/**
 * Realistic fictional Google Maps places — mock only.
 * No real businesses or personal data.
 */

import type { GoogleMapsPlace } from "@/lib/scraping/connectors/google-maps/types";

type SeedCity = {
  city: string;
  region: string;
  countryCode: string;
  lat: number;
  lng: number;
  calling: string;
};

const CITIES: SeedCity[] = [
  {
    city: "Amsterdam",
    region: "Noord-Holland",
    countryCode: "NL",
    lat: 52.3676,
    lng: 4.9041,
    calling: "+31 20",
  },
  {
    city: "Rotterdam",
    region: "Zuid-Holland",
    countryCode: "NL",
    lat: 51.9225,
    lng: 4.4792,
    calling: "+31 10",
  },
  {
    city: "Berlin",
    region: "Berlin",
    countryCode: "DE",
    lat: 52.52,
    lng: 13.405,
    calling: "+49 30",
  },
  {
    city: "Munich",
    region: "Bavaria",
    countryCode: "DE",
    lat: 48.1351,
    lng: 11.582,
    calling: "+49 89",
  },
  {
    city: "Antwerp",
    region: "Antwerpen",
    countryCode: "BE",
    lat: 51.2194,
    lng: 4.4025,
    calling: "+32 3",
  },
  {
    city: "Brussels",
    region: "Brussels",
    countryCode: "BE",
    lat: 50.8503,
    lng: 4.3517,
    calling: "+32 2",
  },
  {
    city: "Paris",
    region: "Île-de-France",
    countryCode: "FR",
    lat: 48.8566,
    lng: 2.3522,
    calling: "+33 1",
  },
  {
    city: "Lyon",
    region: "Auvergne-Rhône-Alpes",
    countryCode: "FR",
    lat: 45.764,
    lng: 4.8357,
    calling: "+33 4",
  },
  {
    city: "London",
    region: "Greater London",
    countryCode: "GB",
    lat: 51.5074,
    lng: -0.1278,
    calling: "+44 20",
  },
  {
    city: "Manchester",
    region: "Greater Manchester",
    countryCode: "GB",
    lat: 53.4808,
    lng: -2.2426,
    calling: "+44 161",
  },
  {
    city: "New York",
    region: "New York",
    countryCode: "US",
    lat: 40.7128,
    lng: -74.006,
    calling: "+1 212",
  },
  {
    city: "Chicago",
    region: "Illinois",
    countryCode: "US",
    lat: 41.8781,
    lng: -87.6298,
    calling: "+1 312",
  },
  {
    city: "Barcelona",
    region: "Catalonia",
    countryCode: "ES",
    lat: 41.3874,
    lng: 2.1686,
    calling: "+34 93",
  },
  {
    city: "Madrid",
    region: "Madrid",
    countryCode: "ES",
    lat: 40.4168,
    lng: -3.7038,
    calling: "+34 91",
  },
  {
    city: "Rome",
    region: "Lazio",
    countryCode: "IT",
    lat: 41.9028,
    lng: 12.4964,
    calling: "+39 06",
  },
  {
    city: "Milan",
    region: "Lombardy",
    countryCode: "IT",
    lat: 45.4642,
    lng: 9.19,
    calling: "+39 02",
  },
];

const CATEGORIES: {
  type: string;
  types: string[];
  namePrefix: string;
}[] = [
  {
    type: "restaurant",
    types: ["restaurant", "food", "point_of_interest"],
    namePrefix: "Harbor Table",
  },
  {
    type: "cafe",
    types: ["cafe", "food", "point_of_interest"],
    namePrefix: "Copper Bean",
  },
  {
    type: "florist",
    types: ["florist", "store", "point_of_interest"],
    namePrefix: "Petal Lane",
  },
  {
    type: "gym",
    types: ["gym", "health", "point_of_interest"],
    namePrefix: "Summit Fitness",
  },
  {
    type: "dentist",
    types: ["dentist", "health", "point_of_interest"],
    namePrefix: "Bright Smile Dental",
  },
  {
    type: "hotel",
    types: ["lodging", "hotel", "point_of_interest"],
    namePrefix: "Canal View Inn",
  },
  {
    type: "plumber",
    types: ["plumber", "home_goods_store", "point_of_interest"],
    namePrefix: "Pipewright Services",
  },
  {
    type: "bakery",
    types: ["bakery", "food", "store", "point_of_interest"],
    namePrefix: "Oven & Oak",
  },
  {
    type: "bookstore",
    types: ["book_store", "store", "point_of_interest"],
    namePrefix: "Leaf & Spine Books",
  },
  {
    type: "auto_repair",
    types: ["car_repair", "point_of_interest"],
    namePrefix: "Northside Autocare",
  },
];

const WEEKDAY_TEMPLATES = [
  [
    "Monday: 9:00 AM – 5:00 PM",
    "Tuesday: 9:00 AM – 5:00 PM",
    "Wednesday: 9:00 AM – 5:00 PM",
    "Thursday: 9:00 AM – 5:00 PM",
    "Friday: 9:00 AM – 4:00 PM",
    "Saturday: Closed",
    "Sunday: Closed",
  ],
  [
    "Monday: 8:00 AM – 8:00 PM",
    "Tuesday: 8:00 AM – 8:00 PM",
    "Wednesday: 8:00 AM – 8:00 PM",
    "Thursday: 8:00 AM – 9:00 PM",
    "Friday: 8:00 AM – 9:00 PM",
    "Saturday: 9:00 AM – 6:00 PM",
    "Sunday: 10:00 AM – 4:00 PM",
  ],
  [
    "Monday: 10:00 AM – 6:00 PM",
    "Tuesday: 10:00 AM – 6:00 PM",
    "Wednesday: 10:00 AM – 6:00 PM",
    "Thursday: 10:00 AM – 6:00 PM",
    "Friday: 10:00 AM – 6:00 PM",
    "Saturday: 10:00 AM – 5:00 PM",
    "Sunday: Closed",
  ],
];

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildPlace(index: number): GoogleMapsPlace {
  const n = index + 1;
  const city = CITIES[index % CITIES.length]!;
  const category = CATEGORIES[index % CATEGORIES.length]!;
  const hours = WEEKDAY_TEMPLATES[index % WEEKDAY_TEMPLATES.length]!;

  const name = `${category.namePrefix} ${city.city} ${n}`;
  const streetNumber = 10 + (n % 90);
  const street = `Mock Avenue ${streetNumber}`;
  const postalCode = `${10000 + ((n * 17) % 80000)}`;
  const domain = `${slugify(name) || `maps-place-${n}`}.example`;

  const includeWebsite = n % 7 !== 0;
  const includePhone = n % 11 !== 0;
  const rating = Number((2.8 + (n % 22) / 10).toFixed(1));
  const reviews = (n * 13) % 480;

  return {
    placeId: `mock_place_${String(n).padStart(3, "0")}`,
    name,
    formattedAddress: `${street}, ${postalCode} ${city.city}, ${city.countryCode}`,
    street,
    postalCode,
    city: city.city,
    region: city.region,
    countryCode: city.countryCode,
    websiteUri: includeWebsite ? `https://${domain}` : null,
    internationalPhoneNumber: includePhone
      ? `${city.calling} ${String(5550100 + n).slice(-7)}`
      : null,
    nationalPhoneNumber: includePhone
      ? String(5550100 + n).slice(-7)
      : null,
    primaryType: category.type,
    types: category.types,
    rating: n % 13 === 0 ? null : Math.min(5, rating),
    userRatingCount: n % 13 === 0 ? 0 : reviews,
    latitude: Number((city.lat + ((n % 20) - 10) * 0.002).toFixed(6)),
    longitude: Number((city.lng + ((n % 17) - 8) * 0.002).toFixed(6)),
    openingHours: {
      openNow: n % 3 !== 0,
      weekdayText: [...hours],
    },
    businessStatus: n % 29 === 0 ? "CLOSED_TEMPORARILY" : "OPERATIONAL",
    googleMapsUri: `https://maps.example.local/?q=place_id:mock_place_${String(n).padStart(3, "0")}`,
  };
}

/** Fixed catalog of 52 fictional places for deterministic tests. */
export const GOOGLE_MAPS_MOCK_PLACES: GoogleMapsPlace[] = Array.from(
  { length: 52 },
  (_, index) => buildPlace(index),
);

/** Intentional invalid samples for validator coverage (still fictional). */
export const GOOGLE_MAPS_INVALID_MOCK_PLACES: GoogleMapsPlace[] = [
  {
    placeId: "mock_place_invalid_name",
    name: "   ",
    formattedAddress: "Unknown",
    city: "Nowhere",
    countryCode: "NL",
    types: ["point_of_interest"],
    rating: 4,
    userRatingCount: 10,
    latitude: 52.1,
    longitude: 4.1,
    googleMapsUri: "https://maps.example.local/?q=invalid-name",
  },
  {
    placeId: "mock_place_invalid_country",
    name: "Invalid Country Cafe",
    formattedAddress: "Somewhere",
    city: "Nowhere",
    countryCode: "XX",
    websiteUri: "https://invalid-country.example",
    internationalPhoneNumber: "+99 000 0000",
    types: ["cafe"],
    rating: 3.5,
    userRatingCount: 4,
    latitude: 0,
    longitude: 0,
    googleMapsUri: "https://maps.example.local/?q=invalid-country",
  },
  {
    placeId: "mock_place_invalid_website",
    name: "Broken Website Bistro",
    formattedAddress: "Amsterdam",
    city: "Amsterdam",
    countryCode: "NL",
    websiteUri: "not-a-url",
    internationalPhoneNumber: "+31 20 555 9999",
    types: ["restaurant"],
    rating: 6.5,
    userRatingCount: 2,
    latitude: 52.37,
    longitude: 4.9,
    googleMapsUri: "https://maps.example.local/?q=invalid-website",
  },
];

export function getGoogleMapsMockPlaces(options?: {
  countries?: string[];
  cities?: string[];
  categories?: string[];
  query?: string;
  limit?: number;
  includeInvalidSamples?: boolean;
}): GoogleMapsPlace[] {
  const countries = options?.countries?.map((c) => c.toUpperCase());
  const cities = options?.cities?.map((c) => c.toLowerCase());
  const categories = options?.categories?.map((c) => c.toLowerCase());
  const query = options?.query?.trim().toLowerCase();
  const limit = options?.limit ?? 50;

  let places = [...GOOGLE_MAPS_MOCK_PLACES];

  if (options?.includeInvalidSamples) {
    places = [...places, ...GOOGLE_MAPS_INVALID_MOCK_PLACES];
  }

  if (countries?.length) {
    places = places.filter((place) =>
      countries.includes(place.countryCode.toUpperCase()),
    );
  }

  if (cities?.length) {
    places = places.filter((place) =>
      cities.includes(place.city.toLowerCase()),
    );
  }

  if (categories?.length) {
    places = places.filter((place) => {
      const primary = (place.primaryType ?? "").toLowerCase();
      return (
        categories.includes(primary) ||
        place.types.some((type) => categories.includes(type.toLowerCase()))
      );
    });
  }

  if (query && query.length >= 2) {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

    const matched = places.filter((place) => {
      const haystack = [
        place.name,
        place.primaryType ?? "",
        ...place.types,
        place.city,
      ]
        .join(" ")
        .toLowerCase();

      return tokens.some((token) => {
        if (haystack.includes(token)) return true;
        if (
          (token.includes("flower") || token.includes("bloem")) &&
          (haystack.includes("florist") || haystack.includes("petal"))
        ) {
          return true;
        }
        if (token.includes("shop") && haystack.includes("store")) return true;
        return false;
      });
    });

    // Keep geo filters; only relax keyword when nothing matched.
    places = matched.length > 0 ? matched : places;
  }

  return places.slice(0, Math.max(1, limit));
}
