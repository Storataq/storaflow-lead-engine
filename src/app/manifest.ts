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
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "nl",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Home",
        url: "/dashboard",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
      {
        name: "CRM",
        short_name: "CRM",
        url: "/crm",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
      {
        name: "Tasks",
        short_name: "Tasks",
        url: "/crm/tasks",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
      {
        name: "AI Copilot",
        short_name: "AI",
        url: "/copilot",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
    ],
  };
}
