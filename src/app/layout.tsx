import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/lib/pwa/register-sw";
import { PushSubscribeButton } from "@/lib/pwa/PushSubscribeButton";

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
      <body>
        <ServiceWorkerRegister />
        <div className="fixed bottom-4 right-4 z-50">
          <PushSubscribeButton />
        </div>
        {children}
      </body>
    </html>
  );
}
