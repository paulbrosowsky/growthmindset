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
            __html: `(function(){function f(){var w=window.innerWidth,d=document.documentElement.style,z,a;if(w>=900){z=1.15;a=320}else{z=Math.min(1.1,w/286);a=Math.min(w,480)/z}d.setProperty('--z',String(z));d.setProperty('--aw',a+'px')}f();window.addEventListener('resize',f)})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
