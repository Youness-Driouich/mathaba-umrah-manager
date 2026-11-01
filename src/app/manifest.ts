import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mathaba Umrah Manager",
    short_name: "Mathaba",
    description: "Umrah packages calculation, cost control, and quotation management platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#047857",
    theme_color: "#047857",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
