import Image from "next/image";
import Link from "next/link";
import { KickerDot } from "@/components/ui";
import { Confetti } from "@/components/Confetti";

export default function SuccessPage() {
  return (
    <main className="mx-auto max-w-form px-4 sm:px-6 py-8 sm:py-16 lg:py-20">
      {/* Feestmoment (meeting 2026-06-11). TODO: Nobox-GIF van Sebas hier later bij. */}
      <Confetti />
      <header className="flex items-center justify-between mb-16 sm:mb-24 animate-fade-in">
        <Image
          src="/nobox-logo.png"
          alt="Nobox"
          width={1240}
          height={541}
          priority
          className="w-28 sm:w-36 lg:w-44 h-auto dark:brightness-0 dark:invert"
        />
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nbx-green text-nbx-ink text-[11px] uppercase tracking-kicker font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-nbx-ink animate-breathe" />
          Ontvangen
        </div>
      </header>

      <section className="mb-12 sm:mb-16">
        <div
          className="mb-6 animate-slide-right"
          style={{ animationDelay: "0.05s" }}
        >
          <KickerDot dotColor="yellow">Status · bevestiging</KickerDot>
        </div>
        <h1
          className="text-[3.25rem] leading-[0.88] sm:text-7xl lg:text-8xl mb-8 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Je intake
          <br />
          staat klaar.
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl text-nbx-text/70 leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.35s" }}
        >
          We zijn meteen aan de slag gegaan met de voorbereiding. Je krijgt
          binnen een paar minuten een welkomstmail met de details.
        </p>
      </section>

      <div
        className="nbx-card animate-fade-up-slow"
        style={{ animationDelay: "0.5s" }}
      >
        <KickerDot className="mb-5">Wat er nu gebeurt</KickerDot>
        <ul className="space-y-3.5">
          {[
            "Een eigen Drive-map voor jullie wordt automatisch aangemaakt",
            "De juiste mensen op ons team krijgen direct een melding",
            "Toegangsverzoeken (Google Ads, Search Console) gaan apart uit",
            "Vlak voor de startdatum krijg je een kick-off uitnodiging",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-nbx-green/40 text-nbx-text text-[11px] font-medium flex items-center justify-center font-cabinet">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-nbx-text/80 leading-relaxed pt-0.5">
                {step}
              </span>
            </li>
          ))}
        </ul>

        <Link href="/" className="nbx-btn-secondary mt-10 -ml-3">
          ← Terug naar start
        </Link>
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
