import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { OrderProvider } from "@/lib/context/OrderContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ImprimeYA - Simple!",
    template: "%s | ImprimeYA",
  },
  description: "Sistema de auto-servicio de impresion fotografica. Subi tus fotos, diseña y recoge en minutos.",
  manifest: "/manifest.json",
  applicationName: "ImprimeYA",
  keywords: ["impresion", "fotos", "collage", "poster", "simple", "costa rica"],
  authors: [{ name: "Simple!" }],
  creator: "Simple!",
  publisher: "Simple!",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ImprimeYA",
  },
  openGraph: {
    type: "website",
    siteName: "ImprimeYA",
    title: "ImprimeYA - Simple!",
    description: "Imprime tus fotos en minutos. Subi, diseña y recoge.",
    locale: "es_CR",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFB902",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* PWA meta tags adicionales para iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ImprimeYA" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Splash screens para iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/icons/icon-512x512.png"
          media="(device-width: 375px) and (device-height: 812px)"
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased h-full bg-background`}>
        <OrderProvider>
          <main className="h-full">
            {children}
          </main>
          <Toaster position="top-center" richColors />
        </OrderProvider>
      </body>
    </html>
  );
}
