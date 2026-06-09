"use client";

import { useEffect, useState } from "react";

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Zwevende licht/donker-schakelaar. Persisteert de keuze in localStorage ('nbx-theme'). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("nbx-theme", next ? "dark" : "light");
    } catch {
      /* localStorage niet beschikbaar - geen probleem */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
      title={dark ? "Lichte modus" : "Donkere modus"}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-nbx-text/10 bg-nbx-surface/80 text-nbx-text/70 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(0,0,0,0.35)] transition-colors hover:border-nbx-text/25 hover:text-nbx-text"
    >
      {mounted && dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
