# Nobox onboarding flow — project context

> **Klant-facing form** voor Nobox waar nieuwe recruitment-bureaus zich aanmelden. Schrijft naar Supabase, triggert n8n, die maakt Drive-folders aan.
>
> Auto-loaded door Claude Code wanneer je in deze folder een sessie start. **Lees dit ALTIJD voor je iets verandert dat een gedeelde resource raakt** (Supabase tabel, n8n workflow, Drive parent-folder).

## Identity

| | |
|---|---|
| Project naam | `Nobox onboarding flow` |
| Folder pad | `D:\Reflow automations\Reflow ai coding folder\projects\Nobox onboarding flow\` |
| Rol | **Form-only** — schrijft data, toont niets na submit behalve confirmation page |
| Stack | Next.js 14.2 App Router + Tailwind + React Hook Form + Zod + Supabase JS |
| Status | v1 actief, getest end-to-end |

## Werkt samen met (cross-project relations)

### `../Nobox dashboard/` — sister-project, **toont onze data**
- Pad: `D:\Reflow automations\Reflow ai coding folder\projects\Nobox dashboard\` (was `Nobox meta ads analyse` tot 2026-05-11)
- Repo/deploy: **eigen** GitHub `reflow-automations/Nobox-ads-dashboard` + **eigen** Vercel-project `nobox-dashboard`
- Wat: Internal team-dashboard. Toont rows uit `onboarding_intakes` op `/admin/klanten` + `/admin/klanten/[id]` (Sebas bewerkt + vult aan)
- **Bij rename/move/breaking-change DAAR**: lees deze CLAUDE.md daar voor cross-impact
- **⚠️ Onze form-vragen ↔ hun dashboard moeten matchen.** Voeg/wijzig/verwijder je een veld in `src/lib/schema.ts`, dan is het pas "af" als ook `src/app/api/submit/route.ts` het naar een echte kolom schrijft (niet alleen `raw_payload`), de kolom bestaat, en het dashboard het toont. Volledige veld-mapping + sync-regel + bekende drift: **`../../wiki/Nobox onboarding data-contract.md`** ([[Nobox onboarding data-contract]])

> **Waarom apart en niet één repo/app?** (besloten 2026-06-11) Bewust twee losse projecten. Wij (dit form) zijn **publiek** (klanten vullen in); het dashboard zit volledig achter een password-middleware. Eén gecombineerde deploy zou gaten in die gate vereisen = lekrisico op het interne dashboard. Plus verschillende stacks (wij Next 14 / React 18; dashboard Next 15 / React 19). Daarom: **twee repos, twee Vercel-projecten, één gedeelde Supabase**. De koppeling is de DATA die wij schrijven en zij lezen (`onboarding_intakes`, `onboarding_intake_logs`, bucket `onboarding-docs`), niet de code.

### Supabase project — `Orakel chat` (extern, gedeeld met andere Nobox-projecten)
- Project ID: `djarvwzvbxlcnxkxczpc`
- URL: `https://djarvwzvbxlcnxkxczpc.supabase.co`
- Region: eu-west-1
- **Tabellen waar dit project SCHRIJFT**:
  - `public.onboarding_intakes` — één row per form-submission, status-pipeline
  - `public.onboarding_intake_logs` — append-only audit per intake
- **Tabellen waar dit project NIET aankomt** (laat met rust — zijn van dashboard/meta-ads):
  - `public.meta_ads_*` (4 tables)
  - `public.meetings`, `public.meeting_chunks`, `public.documents` (Oracle chat)
  - `public.rss_seen`, `public.rank_tracking`
- **Storage bucket dit project schrijft**: `onboarding-docs` (private, 10MB cap)

### n8n workflow — `n8n.reflowautomations.nl` (extern, gedeelde instance)
- Workflow naam: `🌌 Nobox - Onboarding intake (v1)`
- Workflow ID: `ssCuSArOHcC5aEb8`
- Status: active
- Webhook URL: `https://n8n.reflowautomations.nl/webhook/nobox-onboarding-intake`
- **Verwacht payload**: `{ intake_id, reference_id }` (alleen IDs — leest de rest uit Supabase)
- **Bearer token**: in `.env.local` als `N8N_WEBHOOK_TOKEN`, gematched in Code-node `Verify bearer token`
- Andere creds gebruikt: `Rl5ohYS9e2f4s7yr` (Supabase Nobox Oracle), `3tPP55DmwoVcyUYE` (Google Drive OAuth)

### Google Drive — Rogier's persoonlijke Drive (voor v1 testing)
- Parent klant-folder: `Nobox Klanten (test)` — ID `1GXdhM7r_eylR66sJqhx63GIdlbVFMW0i`
- Template folder: `Nobox Klant Template` — ID `1sv2Yfdauw2WlcnyfoT75UqgYNvBAx1x6` (10 subfolders, leeg in v1, vul aan met templates)
- **Bij productie**: Sebas vervangt parent door Nobox's eigen Drive. Update Set-node "Create klant folder" in n8n workflow.

## Belangrijke bestanden

> Let op: de app staat in `src/` in de project-root (NIET in een `frontend/` submap — die structuur is verlaten; oude `launch.json` met `--prefix frontend` staat als `docs/_original-launch.json`).

- `.env.local` — Supabase service-role key + n8n webhook URL + token (NOOIT committen)
- `src/app/api/submit/route.ts` — entry point, validate + write + trigger
- `src/lib/schema.ts` — Zod schema = de waarheid over form-shape; wijzigt mee met DB schema
- `src/lib/database.types.ts` — gegenereerde Supabase TS-types
- `src/lib/supabase/server.ts` — Supabase client (service-role, server-only)
- `n8n/Nobox-Onboarding-v1.json` — workflow export (version-controlled bron; verplaatst 2026-06-11 vanuit verkeerde locatie in het dashboard-project)
- `docs/spec.md` — originele meeting-spec
- `docs/assumptions.md` — alle AI-gokken gelogd (Sebas/Melle valideren later)
- `docs/intake-form-draft.md` — veldenlijst v1
- `docs/drive-structure.md` — folder layout per klant

## Bij rename / move / breaking change van DIT project

1. Update deze CLAUDE.md (Folder pad, oude-naam-aliassen vastleggen)
2. Update `../Nobox dashboard/CLAUDE.md` cross-link (wij zijn hun bron)
3. Update wiki: `wiki/Nobox onboarding flow.md` + cross-links naar dashboard
4. Update `frontend/.env.local` als webhook-URL of supabase-URL verandert
5. Als Supabase tabel-naam of -schema verandert: regenereer types met Supabase MCP `generate_typescript_types` → overschrijf `frontend/src/lib/database.types.ts`
6. Als n8n workflow ID of webhook path verandert: update `.env.local` + dit bestand

## Onbekend / open

- ~~GitHub repo voor dit form-project: nog niet aangemaakt~~: bestaat → `reflow-automations/Nobox-Onboarding` (origin)
- Vercel deploy: repo bestaat; lokaal staat hier geen `.vercel/project.json`, dus deploy-koppeling is op Vercel-account niveau (verifieer naam in Vercel-dashboard bij twijfel)
- ~~Brand-doc Storage → Drive 02-Branding copy~~: geïmplementeerd (node `Sync uploads → Drive` kopieert logo/brand_document/pitch_deck naar de juiste subfolders)
- ~~Mail-branch + ClickUp-branch in n8n~~: geïmplementeerd + live getest (2026-06-09). ClickUp kloont template-space `901511152414` per klant; welkomstmail-draft in Gmail. Zie wiki `Nobox onboarding flow.md`.
- **n8n executions worden NIET bewaard op deze instance** → debug de flow via Supabase `onboarding_intake_logs` (events: `drive_created`/`clickup_created`/`mails_sent`/`*_failed`), niet via de executions-API.
- Error-flow `LaW53wYFdkR9TJle` is sinds 2026-06-09 gekoppeld (`settings.errorWorkflow`) → fouten gaan naar Slack i.p.v. stil falen.
