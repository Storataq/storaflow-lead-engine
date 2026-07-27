import type { MetadataRoute } from "next";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
} from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "nl",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // TODO(branding): Add final icon-192.png and icon-512.png when artwork is ready.
    ],
  };
}
