import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kompass · Lern-Coach",
  description: "Persönlicher KI-Lern-Coach für lebenslanges Lernen im Arbeitsalltag",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F3F3F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Die App ist auf 286 px Breite gestaltet (wie im Designkonzept) und wird auf die echte Breite skaliert. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function f(){var w=window.innerWidth;var z=w>=900?1.35:Math.min(w,440)/286;document.documentElement.style.setProperty('--z',String(z))}f();window.addEventListener('resize',f)})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
