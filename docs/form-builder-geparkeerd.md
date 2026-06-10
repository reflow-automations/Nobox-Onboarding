# Form-builder (per-klant onboarding) - GEPARKEERD

> **Status (2026-06-09): GEPARKEERD.** Advies: niet bouwen bij het huidige volume (<1 nieuwe klant/maand). Het bestaande vaste formulier past zich al aan via ja/nee-toggles, en de tijdwinst (prefill ~10-15 min/onboarding) verdient de bouw-moeite (>=1 dag, ook voor de lean-variant) pas terug bij veel hoger volume. Dit document bewaart de volledige uitwerking zodat we het direct kunnen oppakken zodra het onboarding-volume materieel stijgt of Sebas de handmatige setup als pijn ervaart (lean-variant eerst). Een korte samenvatting staat ook in `WERK-LOG.md` (#7). Raakt niets aan de werkende onboarding-flow.

## Context
Vandaag is het Nobox onboarding-formulier een vast formulier (form v3, 5 secties) dat identiek is voor elke klant. Elke klant krijgt dus ook vragen/toegangsverzoeken voor diensten die ze niet afnemen.

Rogier wil: Nobox-admins maken per klant een formulier, met een vaste kern (altijd) + secties die je per dienst aan/uit zet (SEO, SEA, Social, Content, Website, Branding). Idealiter wordt het formulier automatisch klaargezet vanuit een meeting-transcript (Fathom), waarna Sebas reviewt/togglet/bijwerkt en zelf de klant-specifieke URL verstuurt. Dit moet in het bestaande dashboard (`projects/Nobox dashboard`), niet de benchmark-saas (was puur inspiratie).

**Harde eis:** de bestaande n8n-flow (`ssCuSArOHcC5aEb8`, Drive + ClickUp + welkomstmail) mag NIET breken. Die leest vaste velden uit `onboarding_intakes`. Daarom: elke submission produceert altijd een volledige, geldige `onboarding_intakes`-row; uitgezette secties serialiseren als `{has:false}` (die slaat n8n al over).

**Waarde (eerlijk):** (1) klanten krijgen geen irrelevante vragen, schonere UX + hogere invul-rate; (2) transcript-prefill bespaart Sebas handwerk; (3) consolidatie: het losse form-project verdwijnt in het dashboard. Marge boven het huidige vaste formulier zit vooral in "minder irrelevante vragen + prefill-gemak", B/C-tier nice-to-have, ideaal voor een Builder-day. NIET urgent.

### Mijn eerlijke inschatting (waarde vs moeite)
- Het huidige formulier past zich al deels aan: elk platform heeft een `has: ja/nee`-toggle, dus een klant klikt nu al "n.v.t." bij wat ze niet afnemen. De marginale winst van pre-toggelen per dienst is daarom bescheiden.
- De echte waarde zit in de transcript-prefill (Sebas hoeft niet handmatig op te zetten) + consolidatie. Maar die zit bovenop de builder.
- Leaner alternatief dat ~80% van de waarde pakt voor ~40% moeite: skip de aparte builder-UI. Transcript -> vooringevulde draft-`onboarding_intakes`-row -> Sebas reviewt in de bestaande `/admin/klanten/[id]` detail-pagina (heeft al editable velden) -> klant krijgt een link om te bevestigen/aanvullen (secties conditioneel via een simpele per-klant-config i.p.v. een volledige builder).
- Verdict: de volledige builder = veel moeite voor matige meerwaarde boven het zelf-aanpassende formulier. Bouw 'm pas als je de per-klant-builder echt wilt; anders is de lean-variant de slimme zet. Bij laag onboarding-volume: parkeren tot de pijn echt gevoeld wordt.

## Kern-architectuurbeslissingen (bewust, niet alle alternatieven)
1. **Datamodel = statische catalogus in code + per-form JSONB. Geen `onboarding_form_fields`-tabel.** Het veld-universum is vast en is het n8n-contract; een DB-veldtabel zou admins velden laten verzinnen die n8n niet kan lezen. `schema.ts` blijft single source of truth; de mapper is een pure, testbare functie.
2. **Bouwen in het dashboard**, hergebruik bestaande auth (`requireAdmin()`), service-role Supabase-client (`createServiceClient()`, bypasst RLS), server-action-patroon, en de editable-field-componenten.
3. **Validatie-stack toevoegen**: dashboard mist `zod` + `react-hook-form` + `@hookform/resolvers`. Toevoegen (pin op versies van het losse form-project) en `schema.ts` kopieren naar `lib/onboarding/schema.ts` (zelfstandig, sibling-repo later deprecaten).
4. **LLM-extractie blijft in n8n** (Reflow-conventie), niet in Next.js.

## Datamodel - 1 nieuwe tabel
`public.onboarding_forms` (Supabase `djarvwzvbxlcnxkxczpc`):
- `id uuid pk default gen_random_uuid()`
- `intake_id uuid null` -> FK `onboarding_intakes(id)` (gezet bij submit)
- `client_label text not null` (admin-facing)
- `token text not null unique` (publieke URL-slug; app-gegenereerd, hoge entropie: `crypto.randomBytes(24).toString('base64url')`, GEEN DB-default)
- `status text not null default 'draft'` (`draft|published|submitted|expired`)
- `included_sections jsonb not null default '{}'` (`{core:true, seo:false, sea:true, ...}`; `core` altijd geforceerd `true`)
- `prefill jsonb not null default '{}'` (partiele `schema.ts`-vorm)
- `source text not null default 'manual'` (`manual|transcript`)
- `created_by uuid null`, `notes text null`, `published_at/submitted_at timestamptz null`, `created_at/updated_at timestamptz default now()`
- Indexen: unique(`token`), index(`status`). RLS aan, geen anon-policy (lek van anon-key kan tokens niet enumereren; onze code gebruikt de service-client).
- Migratie via Supabase MCP na goedkeuring (niet auto-apply).

## Sectie/veld-catalogus (`lib/onboarding/catalog.ts`) - Sebas finaliseert de mapping
Bron = `Nobox onboarding flow/src/lib/schema.ts`. Voorstel:
- **CORE (altijd):** `bedrijfsnaam*`, `bedrijfsemail*`, `website`, `factuuradres`, `factuur_email`, `concurrenten`, `voorkeur_vergader_tijd*`, `bijzonderheden` + vault-info-blok. (* = Zod-verplicht)
- **SEO:** `search_console`, `ga4`
- **SEA:** `google_ads`
- **Social:** `meta_business`, `linkedin`, `instagram`, `overige_platforms`
- **Website:** `website_cms`
- **Content:** `klantcases_text`, `contentstrategie_text` (+ evt. `pitch_deck`-upload)
- **Branding:** `logo`-upload, `branding`-upload + `brand_notes`, `brand_color_hex`, `foto_video_drive_link`

Open catalogus-vragen voor Sebas: hoort GA4 bij SEO of apart? `pitch_deck` bij Content of Branding? "off"-vorm van `website_cms` (geen `has`-veld)? En vooral: welke huidige vragen schrappen/conditioneel maken (Rogier's waarde-vraag).

## Routes & bestanden (toevoegen in dashboard)
**Admin (achter `requireAdmin`, onder `/admin/klanten/forms`):**
- `app/admin/klanten/forms/page.tsx` - lijst forms (draft/published/submitted) + "Nieuw formulier"
- `app/admin/klanten/forms/[formId]/page.tsx` - laadt form (service-client), rendert builder
- `app/admin/klanten/forms/builder.tsx` - client component: sectie-toggle-grid + per-veld prefill-editors + Publish + copy-URL (hergebruik interactiemodel van `platform-editor.tsx` + `editable-fields.tsx`)
- `app/admin/klanten/forms/actions.ts` - server actions, elk `await requireAdmin()` eerst: `createForm`, `updateFormSections`, `updateFormPrefill`, `publishForm` (mint token), `regenerateToken`, `unpublishForm`, `deleteForm`, optioneel `sendFormLinkToClient`
- Nav-entry "Formulieren" toevoegen

**Publiek (GEEN auth):**
- `app/form/[token]/page.tsx` - laadt form by token waar `status='published'` (service-client); anders 404/"verlopen of al ingevuld". Nbx-publieke styling leeft hier.
- `app/form/[token]/form-renderer.tsx` - client, RHF + `zodResolver`; rendert alleen `core` + ingeschakelde secties; hydrateert defaults uit `prefill`
- `app/form/[token]/submitted/page.tsx` - bevestiging (kopie van `success/page.tsx`)
- `app/api/form/[token]/submit/route.ts` - publieke POST (`runtime="nodejs"`): token->form (service-client), guard `published`, Zod-valideer, mapper, insert intake + uploads naar `onboarding-docs` + trigger n8n. Port van `Nobox onboarding flow/src/app/api/submit/route.ts`. Daarna `onboarding_forms.status='submitted', intake_id=<id>`.

**Middleware (`middleware.ts`):** voeg aan `isPublic`-keten toe: `/form/`, `/api/form/`, `/api/onboarding/draft-from-transcript`. `/admin/...` blijft beschermd; draft-endpoint is bearer-checked in de handler.

**Env:** voeg `N8N_WEBHOOK_URL` + `N8N_WEBHOOK_TOKEN` toe aan dashboard `.env.local` + `.env.example` (staan nu alleen in losse form-project).

## Submission-mapping (`lib/onboarding/map-to-intake.ts`, pure functie)
Server-side, vertrouwt client NIET:
1. Voor elke sectie NIET in `included_sections`: forceer platform-objecten naar "off": `google_ads/search_console/ga4/meta_business/linkedin/instagram` -> `{has:false}`; `website_cms` -> `{cms_type:"Geen"}` (Sebas bevestigt); Content/Branding tekst+uploads -> weglaten/`null`. Mapper overschrijft uitgezette secties (anti-tamper), merge't geen client-data.
2. Altijd CORE-scalars invoegen.
3. `brand_notes` <- `branding.notes`; uploads als bestaande `UPLOAD_FIELDS` (`logo_*`/`brand_document_*`/`pitch_deck_*`).
4. `raw_payload` <- volledige submission.
5. Insert -> `{id, reference_id}` -> uploads -> POST n8n `{intake_id, reference_id}`.

Netto: identieke row-vorm als nu, alleen meer `{has:false}` (uitgezette secties), die slaat n8n al over. Workflow `ssCuSArOHcC5aEb8` blijft ongemoeid.

## Transcript-prefill (Fase 2) - contract
Fathom-flow `bI419O4rcQSVUPYq` heeft al titel-filter IF-nodes. Voeg een IF-branch voor onboarding-prep-titels toe -> AI Agent extraheert -> bearer-POST naar nieuw dashboard-endpoint. (Als er later meerdere titel-types bijkomen: vervang de IF-keten door een Switch-node op titel, schaalt netter dan geneste IF's.)
`POST /api/onboarding/draft-from-transcript` (bearer = `N8N_WEBHOOK_TOKEN`-stijl):
```jsonc
{
  "client_label": "Acme Recruitment BV",
  "services": ["sea","social","branding"],   // SectionKey minus core
  "prefill": { "bedrijfsnaam":"...", "google_ads":{"has":true,"customer_id":"..."}, ... }, // partiele schema.ts-vorm
  "notes": "Klant heeft nog geen GA4..."
}
```
Server: `included_sections` = `{core:true, ...services->true, rest->false}`; `prefill` na allow-list-filter op bekende `schema.ts`-paden; als prefill een platform-object heeft voor een sectie die niet in `services` zit -> sectie AAN zetten (Sebas ziet 't, kan uit). `status='draft', source='transcript'`. Response `{form_id, admin_url}` -> n8n pingt Sebas. Bestaande Fathom-paden niet aanraken, alleen branch toevoegen.

Lifecycle: `draft` -> admin reviewt/togglet/bewerkt -> `publishForm` (token + `published`) -> publiek `/form/<token>` -> submit -> `submitted` (+ `intake_id`).

## Fasering (elk los shippable)
**Fase 1 - builder + publiek form + submit->n8n (geen AI):** migratie `onboarding_forms` -> deps (zod/RHF) -> `lib/onboarding/{schema(copy),catalog,map-to-intake}` -> env-vars -> admin-pagina's + actions + Nav -> publieke pagina's + submit-route -> middleware-allowlist.
**Fase 2 - transcript-prefill:** `draft-from-transcript`-endpoint + middleware -> n8n IF-branch in `bI419O4rcQSVUPYq` (AI extract -> POST -> Sebas pingen). Builder consumeert `included_sections`+`prefill` al.

## Risico's / edge cases
- Token: hoge entropie, niet sequentieel, alleen `published` resolvet; `regenerateToken`/`unpublish` mogelijk.
- Publieke route ALTIJD service-client (RLS aan); service-role nooit naar browser.
- Anti-tamper: mapper forceert off-secties server-side.
- Uploads publiek: base64 -> `onboarding-docs` path `${intake.id}/...`; size-guard client + server.
- Dubbele submit: na `submitted` toont publieke pagina "al ingevuld"; API weigert re-submit.
- Losse form-project (`Nobox onboarding flow`): deprecaten zodra Fase 1 pariteit heeft + 1 echte klant de nieuwe flow doorliep; daarna domein naar dashboard, repo archiveren. Tijdens transitie leeft `schema.ts` op 2 plekken -> dashboard-kopie wordt canoniek.

## Verificatie (end-to-end, na Fase 1)
1. Admin: nieuw form -> toggle SEA+Social aan, rest uit -> publish -> copy URL.
2. Incognito `/form/<token>` -> invullen -> submit.
3. Check via Supabase MCP: nieuwe `onboarding_intakes`-row met geldige vorm; uitgezette secties = `{has:false}`; `raw_payload` compleet.
4. Check n8n vuurde (Drive-folder + ClickUp-space + welkomstmail-draft via de bestaande flow, zelfde verificatie als de huidige live-tests via `onboarding_intake_logs`: `drive_created -> clickup_created -> mails_sent`).
5. `onboarding_forms.status` = `submitted`, `intake_id` gezet.
6. Ruim test-artefacten op (zoals bij eerdere tests).

## Kritieke bestaande bestanden (hergebruik/port)
- `Nobox onboarding flow/src/lib/schema.ts` (catalogus-bron, kopieren)
- `Nobox onboarding flow/src/app/api/submit/route.ts` (submit-logica porten)
- `Nobox dashboard/middleware.ts` (publieke allowlist)
- `Nobox dashboard/app/admin/klanten/actions.ts` (server-action-patroon)
- `Nobox dashboard/app/admin/klanten/[id]/platform-editor.tsx` + `editable-fields.tsx` (toggle/edit-UI hergebruiken)
- `Nobox dashboard/lib/{auth.ts, supabase/server.ts}` (auth + service-client)

## OPEN VRAGEN (afvinken voor bouw)

### Voor Sebas (inhoud + proces - hij bepaalt het meeste)
1. **Dienst->sectie mapping bevestigen.** Klopt de indeling CORE / SEO / SEA / Social / Content / Website / Branding? Mist er een dienst (bv. e-mailmarketing, CRO, video)?
2. **Welke huidige vragen schrappen of conditioneel maken?** Staan er nu vragen in die altijd gesteld worden maar eigenlijk maar voor 1 dienst relevant zijn? (De waarde-vraag.)
3. **GA4** - hoort die bij de SEO-sectie, of moet analytics altijd gevraagd worden (eigen "Analytics"-sectie)?
4. **Pitch deck-upload** - bij Content of bij Branding?
5. **Website-sectie uit** - wat is dan de "lege" waarde voor `website_cms`? (`cms_type = "Geen"`?)
6. **Welke meeting-titel(s) triggeren de prefill?** Exacte titel-conventie / keyword / tag in Fathom.
7. **Mag het systeem een sectie AAN zetten** als het transcript wel data vond voor een dienst die niet expliciet genoemd is? Of strikt alleen wat besproken is?
8. **Hoeveel pre-fill wil je de klant tonen?** Grotendeels ingevuld om te bevestigen/aanvullen, of vult hij zelf in?
9. **Link versturen**: kopieert Sebas de URL zelf en mailt 'm, of moet het systeem 'm automatisch mailen?

### Voor Rogier (technisch + strategisch)
1. **Volledige builder, lean-variant, of parkeren?** (Geparkeerd op 2026-06-09.)
2. **Onboarding-volume**: hoeveel nieuwe klanten per maand? (Onder ~2/maand weegt de bouw-moeite zwaarder dan de tijdwinst.)
3. **Losse form-project (`Nobox onboarding flow`) deprecaten** na pariteit + domein naar dashboard redirecten - akkoord?
4. **LLM-extractie in n8n** via de bestaande "Claude van Nobox"-cred - akkoord? Welk model (Sonnet)?
5. **Env-secrets** (`N8N_WEBHOOK_URL` + `N8N_WEBHOOK_TOKEN`) ook in het dashboard-project zetten - akkoord?
6. **IF->Switch** in Fathom zodra er meer titel-types komen - meenemen (genoteerd).

### Catalogus-details (klein, kunnen tijdens bouw met Sebas)
- GA4-sectie (zie Sebas #3), pitch_deck-sectie (#4), `website_cms` off-vorm (#5).
