# Nobox Onboarding — Frontend

Next.js 14 (App Router) + Tailwind + React Hook Form + Zod. Multi-step intake form in Nobox-branding die POST naar de n8n-webhook.

## Setup

```bash
cd "D:/Reflow automations/Reflow ai coding folder/projects/Nobox onboarding flow/frontend"
npm install
# .env.local is al voor je gegenereerd met de live webhook + token
npm run dev
```

Open http://localhost:3000 — form verschijnt.

## Hoe het werkt

```
Browser
  → /api/submit (Vercel server-side route)
      → fetch n8n webhook met Authorization: Bearer <token>
      → krijgt reference_id terug
  → /success?ref=NBX-... toont bevestiging
```

Server-side route houdt de bearer token verborgen voor de browser — token is **nooit** in client-side bundle.

## Stack

| Laag | Keuze |
|------|-------|
| Framework | Next.js 14 App Router |
| Styling | Tailwind + brand-tokens (zie `tailwind.config.ts`) |
| Form state | React Hook Form |
| Validatie | Zod schemas (`src/lib/schema.ts`) |
| Fonts | Cabinet Grotesk + Switzer via Fontshare CDN |
| Deploy | Vercel (later) |

## Brand-tokens (uit officiële Nobox Brand Guide)

| Token | Hex |
|-------|-----|
| `nbx-bg` | `#EAECE7` Neutral grey — primaire achtergrond |
| `nbx-bg-2` | `#D5CAD0` Refined grey — secundair |
| `nbx-text` | `#000000` Timeless black — alle tekst |
| `nbx-green` | `#E6FB7C` Ambitious green — primary CTA |
| `nbx-purple` | `#D2BBFF` Digital purple — info/secondary |
| `nbx-yellow` | `#FFE228` Optimistic yellow — highlights |

## v1 limitaties (zie `docs/assumptions.md`)

- Geen file-uploads (logo / brand-guide) — komt in v2 met Vercel Blob
- Fonts via Fontshare CDN — v2 migratie naar `next/font/local` voor offline + faster
- Bedankpagina is simpel — v2 toont volledige "wat-gebeurt-er-nu" summary

## Test webhook lokaal

```bash
curl -X POST "http://localhost:3000/api/submit" \
  -H "Content-Type: application/json" \
  -d '{"bedrijfsnaam":"Test BV","contactpersoon":{"email":"t@t.nl","voornaam":"Test","achternaam":"User","functie":"CEO"},"branche":"retail","diensten":["SEO"],"doelen":{"hoofddoel":"test"},"google_ads":{"has":false},"search_console":{"has":false},"ga4":{"has":false},"meta_business":{"has":false},"vault":{"later_via_mail":true},"branding":{"tone_of_voice":"informeel"},"gewenste_startdatum":"2026-06-01","akkoord_av":true}'
```
