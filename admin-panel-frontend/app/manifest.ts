import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Appuri Hogosha",
    short_name: "Appuri",
    description:
      "School notification platform — real-time updates on university activities, grades, and attendance for parents.",
    start_url: "/parentnotification",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e293b",
    orientation: "portrait",
    categories: ["education"],
    icons: [
      {
        src: "/assets/cat.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/cat.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/assets/image.png",
        sizes: "640x320",
        type: "image/png",
      },
    ],
  };
}
