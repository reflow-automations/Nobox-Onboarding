import Image from "next/image";
import { OnboardingForm } from "@/components/OnboardingForm";
import { KickerDot } from "@/components/ui";

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

      <section className="mb-14 sm:mb-20">
        <div
          className="mb-6 sm:mb-8 animate-slide-right"
          style={{ animationDelay: "0.05s" }}
        >
          <KickerDot>B2B Marketing · Recruitment</KickerDot>
        </div>
        <h1
          className="text-[3.25rem] leading-[0.88] sm:text-7xl lg:text-8xl mb-8 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Welkom.
          <br />
          <span className="text-nbx-text/55">Vijf minuten,</span>
          <br />
          alles staat klaar.
        </h1>
        <p
          className="text-base sm:text-lg lg:text-xl max-w-xl text-nbx-text/70 leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          Vertel ons over jullie organisatie en doelen. Daarna regelen wij de
          Drive-map, taken, toegangsverzoeken en de eerste mails — zonder dat
          jullie iets twee keer hoeven typen.
        </p>
      </section>

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
