import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Archivario · Tus juegos, a tu ritmo",
    short_name: "Archivario",
    description:
      "Tu biblioteca de videojuegos y un diario de pequeños grandes viajes.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0e16",
    theme_color: "#0c0e16",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Al mantener pulsado el icono de la app instalada.
    shortcuts: [
      {
        name: "Registrar hoy",
        short_name: "Registrar",
        url: "/?accion=registrar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Añadir juego",
        short_name: "Añadir",
        url: "/?accion=anadir",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "¿A qué juego esta noche?",
        short_name: "Esta noche",
        url: "/?accion=esta-noche",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Diario", url: "/diario" },
    ],
  };
}
