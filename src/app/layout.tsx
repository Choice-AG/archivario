import type { Metadata } from "next";
import "./globals.css";
import { themeScript } from "@/features/library/presentation/theme";
export const metadata: Metadata = {
  title: {
    default: "Archivario · Tus juegos, a tu ritmo",
    template: "%s · Archivario",
  },
  description:
    "Tu biblioteca de videojuegos y un diario de pequeños grandes viajes. Privado, sin prisas.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
