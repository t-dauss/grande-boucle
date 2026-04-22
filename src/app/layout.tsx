import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maillot Jaune Predictor",
  description: "Tour de France 2026 office betting PWA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
