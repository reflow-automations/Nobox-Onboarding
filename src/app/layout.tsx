import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onboarding — Nobox",
  description: "Welkom bij Nobox. Vul je intake in om de samenwerking te starten.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500&f[]=switzer@300,400,500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-nbx-bg text-nbx-text antialiased">
        {children}
      </body>
    </html>
  );
}
