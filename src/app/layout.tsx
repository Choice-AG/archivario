import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeScript } from "@/features/library/presentation/theme";
import { ServiceWorker } from "@/features/library/presentation/service-worker";
export const viewport: Viewport = { themeColor: "#0c0e16" };
export const metadata: Metadata = {
  applicationName: "Archivario",
  appleWebApp: {
    capable: true,
    title: "Archivario",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
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
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
