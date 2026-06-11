import Image from "next/image";
import { OnboardingForm } from "@/components/OnboardingForm";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-form px-4 sm:px-6 py-8 sm:py-16 lg:py-20">
      <header className="flex items-center justify-between mb-16 sm:mb-24 animate-fade-in">
        <Image
          src="/nobox-logo.png"
          alt="Nobox"
          width={1240}
          height={541}
          priority
          className="w-28 sm:w-36 lg:w-44 h-auto dark:brightness-0 dark:invert"
        />
        <div className="nbx-chip-light">
          <span className="w-1.5 h-1.5 rounded-full bg-nbx-green" />
          Intake · 2026
        </div>
      </header>

      {/* De welkom-hero (alleen op stap 1) leeft in OnboardingForm, zodat hij op
          stap 2-5 verdwijnt en de klant direct bij de vragen begint. */}
      <div className="animate-fade-up-slow" style={{ animationDelay: "0.5s" }}>
        <OnboardingForm />
      </div>

      <footer className="mt-20 sm:mt-28 pt-8 border-t border-nbx-text/10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-kicker text-nbx-text/40">
          <span>© Nobox</span>
          <span>There is no box</span>
        </div>
      </footer>
    </main>
  );
}
