import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Archivario · Tus juegos, a tu ritmo",
  description:
    "Tu biblioteca de videojuegos y un diario de pequeños grandes viajes. Privado, sin prisas.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
