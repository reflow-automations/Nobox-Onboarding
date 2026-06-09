import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Onboarding — Nobox",
  description: "Welkom bij Nobox. Vul je intake in om de samenwerking te starten.",
};

// No-flash: zet de thema-class vóór paint (opgeslagen keuze, anders systeemvoorkeur).
const themeInit = `(function(){try{var t=localStorage.getItem('nbx-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500&f[]=switzer@300,400,500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-nbx-bg text-nbx-text antialiased">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
