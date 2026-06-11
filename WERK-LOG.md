# Nobox Onboarding Flow - Werk-log

> Self-contained samenvatting, bedoeld zodat een nieuwe/compacte sessie volledig weet wat er besloten en gedaan is.
> Canonieke lange-termijn record = `wiki/Nobox onboarding flow.md` (in de gedeelde workspace-wiki). Volledige uitwerking van de geparkeerde form-builder = `docs/form-builder-geparkeerd.md` (in dit project).
> Secrets (n8n API-key, webhook-bearer) staan NIET in dit bestand: die leven in de n8n-skill (`~/.claude/skills/n8n/SKILL.md`) en in `frontend/.env.local` / de n8n `Verify bearer token`-node.

## Wat het systeem is
Klant-facing onboarding-formulier voor Nobox (recruitment-marketingbureau). Klant vult een formulier in -> schrijft naar Supabase `onboarding_intakes` -> triggert n8n-webhook -> n8n maakt Google Drive-folders, kloont een ClickUp-space met lijsten/statussen/taken, en zet een welkomstmail-concept klaar in Gmail. Vaste, niet-adaptieve form v3 (5 secties). Status v1, end-to-end werkend.

## Kerncomponenten (IDs zijn identifiers, geen secrets)
- **n8n hoofd-workflow**: `ssCuSArOHcC5aEb8` ("🌌 Nobox - Onboarding intake (v1)"), active, **33 nodes**. Base: `https://n8n.reflowautomations.nl`.
- **Webhook**: `POST https://n8n.reflowautomations.nl/webhook/nobox-onboarding-intake`, body `{intake_id, reference_id}`, bearer-token (waarde in n8n skill/.env.local).
- **Error-flow**: `LaW53wYFdkR9TJle` ("🌌 ❌ Nobox - Error Flow" -> Slack-alert), gekoppeld via `settings.errorWorkflow`.
- **Supabase**: project `djarvwzvbxlcnxkxczpc` ("Orakel chat", org `axtiqcjhrgvfcwqhvseg`). Tabellen: `onboarding_intakes`, `onboarding_intake_logs`. Storage-bucket: `onboarding-docs`. Supabase-MCP wijst nu naar de juiste org.
- **ClickUp**: team/workspace `90151021325` ("Nobox Marketing"). n8n-cred `15akL9G3JMamxT4D` ("ClickUp Nobox1"), OAuth2. **Geen ClickUp-MCP beschikbaar** -> gebruik de webhook-helper-workflow-truc (zie Quirks).
  - List Templates: General `t-901523818363`, Content machine `t-901523818368`, Content calendar `t-901523819026`.
  - Team-notify doel-list: `901523510934` (Sebas' Nobox-list). Assignees: Sebas `94810344`, Rogier `94575978`, (Melle `224614800`).
- **Google Drive**: n8n-cred `3tPP55DmwoVcyUYE` ("Google Drive Reflow"). Parent klant-folder `1GXdhM7r_eylR66sJqhx63GIdlbVFMW0i`, template-parent `1sv2Yfdauw2WlcnyfoT75UqgYNvBAx1x6`. (v1 = Rogier's persoonlijke Drive; productie = Nobox's eigen Drive, nog te koppelen.)
- **Gmail**: n8n-cred `rSA10KvMYA9yr49M` (welkomstmail als concept/draft).
- **Fathom-transcript-flow** (los): `bI419O4rcQSVUPYq` ("Fathom summary reflow"), filtert al op meeting-titel via IF-nodes.

## Sessie 2026-06-09 - wat we deden

### 1. Root cause gefixt (waarom de flow stil omviel)
ClickUp template-space `901510969155` (clone-bron) was per ongeluk verwijderd -> de hele ClickUp-tak las uit een 404-space -> elke intake liep dood. En het bleef onopgemerkt omdat de error-flow nooit gekoppeld was. Eerst space geswapt naar `901511152414`; daarna de hele tak herbouwd (zie #4).

### 2. Error-flow gekoppeld
`settings.errorWorkflow = LaW53wYFdkR9TJle` -> fouten gaan nu naar Slack i.p.v. stil falen. Belangrijkste vangnet tegen herhaling.

### 3. Schema-drift opgeschoond
Code-nodes `Build intake-summary md` en `Sync uploads → Drive` lazen nog legacy-velden (`contactpersoon`, `doelen`, `diensten`, `kvk`, `adres`, file-uploads `tov_document`/`klantcases_document`/`contentstrategie_document`) die form v3 niet meer stuurt -> herschreven naar de echte v3-velden (bedrijfsemail, factuur, linkedin, instagram, website_cms, logo/pitch-deck, klantcases_text, contentstrategie_text). Geen crash-risico (DB-kolommen bestaan nog), puur compleetheid.

### 4. ClickUp-tak HERBOUWD: clone -> List Templates (de grote wijziging)
**Probleem ontdekt:** statussen zijn NIET via de API op een lijst te zetten (geen status-endpoint; PUT /list negeert een `statuses`-array). Daardoor kopieerde de oude 17-node clone alleen lijst-NAMEN; statussen werden default en taken faalden (hun custom status bestond niet). De clone deed dus bijna niets nuttigs.
**Oplossing (empirisch bewezen):** `POST /space/{id}/list_template/{t-id}` (createSpaceListFromTemplate) brengt **custom statussen + taken + custom fields** mee EN accepteert een `name`-override.
**Nieuwe ClickUp-tak** (clone-chain verwijderd): `create space` (naam=bedrijfsnaam) -> `createSpaceListFromTemplate` General ("Algemeen") -> `createSpaceListFromTemplate` Content machine ("Content Machine {bedrijfsnaam}") -> `createSpaceListFromTemplate` Content calendar ("Content Calendar") -> `get CM tasks` -> `Build TOV rename batch` -> `ClickUp: rename TOV task` (zijtak, best-effort). `Aggregate clickup result` herschreven (leest space + lijst-ids).
**TOV-rename:** "Bedrijf TOV doc" -> "{bedrijfsnaam} TOV doc". "Persoon TOV doc" -> "{voornaam} TOV doc" alleen als er een voornaam is (form v3 heeft die niet -> blijft staan).
**Workflow ging 44 -> 32 -> 33 nodes.** Live getest (ZZ TEST 4): 3 lijsten, statussen aanwezig (TOV-taken in status `tov text`), naam-override + rename correct, eindstatus `mails_sent`.
**Template-hygiene (BELANGRIJK):** wat in de List Template staat komt 1-op-1 mee. Sebas heeft de templates opgeschoond (oude Craftr-taken eruit). De template is de single source of truth voor de klant-space-structuur. `createSpaceListFromTemplate` met `return_immediately:false` is synchroon (~15-20s/lijst).

### 5. Team-notify toegevoegd
Na `Log: mails_sent`: `ClickUp: get team members` -> `Build notify task` (resolve assignees op e-mail) -> `ClickUp: create notify task`. Maakt een taak in list `901523510934`, titel `Finance — Nieuwe klant: {bedrijfsnaam}` (met EM-DASH; dit is de enige plek waar Rogier de huisstijl-regel "geen em-dashes" expliciet uitzonderde, om Sebas' "Finance — ..."-conventie te matchen). Assignees Sebas + Rogier. Geen Slack (niet van Nobox). Assignee-e-maillijst in de Code-node is uitbreidbaar.

### 6. Welkomstmail credential-sectie herzien (node `Build welkomstmail`)
Bitwarden Send was fout (verzend-only + per-geheim/verloopt). Vervangen door 2 sporen:
- **Spoor 1 gedelegeerde toegang** (voorkeur, geen wachtwoord): klant voegt `marketing@noboxagency.com` toe. Per platform uitgelegd: Google Ads/Meta = "WIJ DOEN", GSC/GA4/LinkedIn/CMS = "JIJ DOET".
- **Spoor 2 (uitzonderingen, bv. Instagram)**: klant deelt login via een eenmalige **onetimesecret.com**-link (gratis, geen account, EU-regio, passphrase-tip) -> stuurt naar Sebas die 'm eenmalig opent. Conditioneel blok (verschijnt alleen als een `vault`-platform `has:true` is). `VAULT_URL`-constante + `[TODO-NOBOX-VAULT-LINK]` + "Open de Nobox vault"-knop verwijderd; tag "VAULT" -> "VEILIGE LINK". Lokaal render-getest + live.

### 7. Form-builder idee (per-klant custom formulier) -> GEPARKEERD
Verkend + volledig uitgewerkt tot plan (`precies-nou-dit-is-rosy-hopcroft.md`): admin bouwt per klant een formulier (vaste kern + toggle-bare dienst-secties), idealiter voor-ingevuld vanuit een Fathom-transcript, in het bestaande Nobox-dashboard. **Besloten te PARKEREN**: bij <1 nieuwe klant/maand is de ROI te laag, en het huidige formulier past zich al aan via ja/nee-toggles. Plan ligt klaar voor als het volume groeit (lean-variant eerst). Raakt niets aan de werkende flow.

## Sessie 2026-06-09 (vervolg) - credential-uitleg in formulier + mail
De onetimesecret-aanpak zat al in de welkomstmail, maar het formulier praatte nog over een oude "vault" (knop naar het niet-bestaande `noboxagency.com/vault`). Gelijkgetrokken:

- **Formulier** (`src/lib/schema.ts`, `src/components/ui.tsx`, `src/components/OnboardingForm.tsx`):
  - `VAULT_URL` weg; `TANGO_GUIDE_URL` + `ONETIMESECRET_URL` (`eu.onetimesecret.com`) toegevoegd in `schema.ts`.
  - Nieuwe `InfoDropdown` (native `<details>`, nbx-stijl) in `ui.tsx`.
  - Sectie 2: per platform een uitklap-dropdown "Hoe voeg ik marketing@noboxagency.com toe?" (waar + hoe, of hoe het koppelverzoek accepteren bij Google Ads/Meta). Instagram verwijst naar onetimesecret.
  - Sectie 3 (`Section3Vault`): herschreven. Geen vault-knop meer; 2-sporen-uitleg + knop naar de Tango-handleiding (hergebruik `ArrowSlideLink`, nieuw tabblad) + "jij maakt de link zelf, wij sturen niks" + lokaal-bewaren-tip.
  - `npm run build` groen (compiled + lint + types + 6 static pages).
- **Welkomstmail** (n8n node `Build welkomstmail`, workflow `ssCuSArOHcC5aEb8`): onetimesecret-link naar `eu.onetimesecret.com`, Tango-link toegevoegd, "jij maakt zelf een eenmalige link" expliciet + lokaal-bewaren-tip. Encoding-veilige PUT (HTTP 200), live geverifieerd: naam-emoji intact (0x1f30c), 33 nodes, Tango + EU-URL aanwezig.
- **Tango-handleiding**: `https://app.tango.us/app/workflow/Create-Secret-Link-for-Europe-0c7898da693e47e6b6b8e98e454abc64` (visuele stap-voor-stap; "Guide me" niet gebruikt want vereist account).
- **Form-builder**: volledige uitwerking verhuisd naar `docs/form-builder-geparkeerd.md` (blijft geparkeerd).

## Sessie 2026-06-09 (vervolg 2) - dashboard afstemmen + checklist auto-check + EU-onetimesecret
Na Rogier's review van het dashboard (5 test-klanten) + een audit (6 parallelle agents) van dashboard-code, Supabase-data, n8n-flow en form v3.

### Bevindingen (kort)
- **Statusverschillen test-klanten** = artefact uit de bouwfase (logs bewijzen het). Op de werkende flow eindigt elke intake op `mails_sent`. `completed` wordt nooit door de flow gezet.
- **Checklist** = Supabase-tabel `onboarding_checklist_items`, geseed door DB-trigger `insert_default_checklist_items` (10 vaste items, `sort_order` 1-10). Had geen auto-afvink-logica.
- **`mails_sent` = Gmail CONCEPT**, geen verzonden mail (Rogier gaat later wel echt versturen, daarom label "Welkomstmail verstuurd" behouden).
- **Schema-drift**: dashboard toont `tone_of_voice` + Contactpersonen/Diensten/Doelen die form v3 niet meer vult; form-`concurrenten` (kolom) werd nergens getoond (dashboard toonde alleen `doelen.concurrenten` JSONB). Platform-toegangen matchen wel met form v3.
- **Wait-nodes**: niet nodig (alles synchroon: ClickUp `return_immediately:false`, Drive blokkeert). Enige zwakte: TOV-rename-tak is fire-and-forget dead-end (`neverError`).

### Gedaan
- **EU-onetimesecret** (form + mail): `eu.onetimesecret.com` bevestigd door Rogier als juiste + duidelijkste pagina. **Tango uit de UI gehaald** (pagina spreekt voor zich, screenshots verouderen). Sectie 3 heeft nu de EU-link als primaire knop + korte uitleg; `TANGO_GUIDE_URL` blijft als optionele (ongebruikte) constante in `schema.ts`. Mail idem: Tango-link weg, link -> `eu.onetimesecret.com`, knopnaam "Create Link" + passphrase-stap gecorrigeerd. Beide builds groen; mail live geverifieerd (PUT 200, 33 nodes, 🌌 intact).
- **DB (SQL klaar, Rogier draait 'm; MCP is read-only)**: `docs/db-onboarding-autocheck-2026-06-09.sql`. (1) auto-check-trigger op statuswijziging vinkt items 4/5/6 (Drive/ClickUp/Welkomstmail) automatisch af; (2) seed-item 7 "Vault-link gedeeld" -> "Inloggegevens ontvangen (onetimesecret)" + bestaande rijen; (3) optioneel: 4 testrijen weg (E2E behouden) + backfill.
- **Dashboard** (`../Nobox dashboard`, build groen): status "Voltooid" -> **"Volledig onboard"** (3 plekken: overzicht STATUS_INFO + teller, detail STATUS_INFO, `editable-fields` STATUS_LABELS); TOV van select -> **vrij tekstveld + document-upload** (nieuwe `AssetUpload`-component + server-action `uploadIntakeAsset` -> storage `onboarding-docs` + `tov_document_*`); **concurrenten** (form-kolom) zichtbaar op de detailpagina (+ in `EDITABLE_SCALAR_FIELDS`); **copy-knop** voor de formulier-URL `https://nobox-onboarding.vercel.app/` in het klantenoverzicht (`CopyFormLink`).
- **Formulier**: concurrenten-veld aangescherpt naar "URLs, 1 per regel" (klaar voor latere concurrentie-analyse-automation).

### Bewust NIET gedaan
- **n8n TOV-rename dead-end**: op verzoek alsnog gedaan, maar veilig: een `Log: tov_renamed`-node achter `rename TOV task` (continue-on-error) i.p.v. de riskante her-wiring van de Aggregate-Code-node. De hoofd-flow blijft ongewijzigd; mislukte renames worden nu gelogd.
- Contactpersonen / Diensten / Doelen-secties in het dashboard: blijven staan (Rogier beslist later).

## Beslissingen (met reden)
- **Template-space swap + error-flow**: stille breuk voorkomen.
- **List Templates i.p.v. clone**: enige API-weg naar statussen + taken; clone deed niets nuttigs.
- **Team-notify in ClickUp, niet Slack**: Slack is niet van Nobox.
- **onetimesecret i.p.v. Bitwarden Send**: Send kan niet ontvangen + verloopt.
- **Form-builder geparkeerd**: lage ROI bij huidig onboarding-volume.

## Open / TODO
- [ ] **Bevestigen**: is `marketing@noboxagency.com` het juiste adres voor gedelegeerde toegang? (staat door de hele welkomstmail) - Rogier twijfelde.
- [ ] **Instagram = Spoor 2** is case-afhankelijk: als IG aan Meta Business hangt -> kan via Business Manager (Spoor 1). Default nu Spoor 2; Sebas beslist per klant.
- [ ] **Nobox eigen Google Drive koppelen** (productie) - Rogier doet dit ~donderdag met Nobox. Dan node `Create klant folder` + template-parent in `Copy templates` updaten (evt. aparte Nobox Drive-cred).
- [x] **Form-kant vault-copy** gelijkgetrokken met onetimesecret (2026-06-09): per-platform "hoe voeg ik marketing@ toe"-dropdowns + Tango-handleiding + `eu.onetimesecret.com` in formulier en mail; vault-knop en `VAULT_URL` weg.
- [x] **onetimesecret-EU-URL** bevestigd (Rogier): `eu.onetimesecret.com` werkt + is de duidelijkste pagina. Tango uit de UI gehaald (form + mail).
- [ ] **DB-SQL draaien** in de Supabase SQL-editor: `docs/db-onboarding-autocheck-2026-06-09.sql` (Claude's MCP is read-only). Auto-check-trigger + item-7 rename + optionele testdata-cleanup. **Nodig voordat de checklist auto-afvinkt.**
- [x] **n8n TOV-rename**: opgelost met een veilige `Log: tov_renamed`-node na `rename TOV task` (continue-on-error, raakt de hoofd-flow niet). PUT 200, 34 nodes. Mislukte renames zijn nu zichtbaar via event `tov_renamed` in `onboarding_intake_logs`.
- [x] **Gedeployed** (2026-06-09): formulier (`Nobox-Onboarding`, commit 484030e) + dashboard (`Nobox-ads-dashboard`, commit 1953c4e) gepusht naar main -> Vercel auto-deploy. (DB-SQL nog handmatig draaien, zie hierboven.)
- [x] **Dark mode formulier** (2026-06-09): licht/donker-toggle (zwevend, rechtsonder) + volledige dark theme via CSS-variabelen; logo inverteert; systeemvoorkeur als default, keuze in localStorage. Gepusht (`Nobox-Onboarding` commit 1487503).
- [x] **Vercel env-vars gezet** (Rogier, 2026-06-09): `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` op het form-Vercel-project -> submit werkt end-to-end (ClickUp-space + Drive-structuur bevestigd door Rogier).
- [x] **Form-uitbreiding** (2026-06-09, commit 187683f): **controle/samenvatting-stap** voor verzenden (lege velden weggelaten); e-mail **quick-fill**-suggesties uit eerder ingevulde adressen; **kopieerbare** `marketing@noboxagency.com`; stap 3 (onetimesecret) als genummerde stappen (geen account/login nodig, deel de link, open 'm zelf niet); logo accepteert meer formaten + **meerdere brand-assets**; klantcases/contentstrategie als **tekst OF document**; **3 merkkleuren** (primair/secundair/accent); foto/video-link met rechten-instructie; **vergadertijd + bijzonderheden verwijderd**. Nieuwe uploads -> Supabase `extra_documents` (jsonb) + storage `onboarding-docs` (defensief in `route.ts`, kan de kern-submit nooit breken). DB: auto-check-trigger + item-7 rename + testdata-cleanup zijn nu live gedraaid (MCP weer read-write).
- [x] **Form v4** (2026-06-09, commit 78b3edf, na Rogier's live test): **contactpersoon** in stap 1 (voornaam verplicht; voedt dashboard `contactpersonen`, welkomstmail-aanhef en de "Persoon TOV doc"-rename die al klaarstond in n8n, geen n8n-wijziging nodig); stap 2 **ja/nee-eerst** (uitleg + velden pas na "ja"), Customer ID-vindplek uitgelegd, vage "ter verificatie"-zinnen vervangen, website nu ja/nee-vraag (bij nee -> cms_type "Geen"), Meta BM-ID-veld optioneel + `NOBOX_BM_ID`-constante (nu leeg -> verwijst naar welkomstmail; **TODO Rogier/Sebas: BM-ID aanleveren**); stap 4 rustiger (sub-kopjes + witruimte, een upload-veld per ding met **meerdere bestanden**: eerste = hoofdbestand/eigen kolom, rest -> `extra_documents` met note; klantcases/contentstrategie als keuze **typen of document**); review-stap toont contactpersoon + bestandsgroepen; scroll-naar-fout + scroll-naar-boven + autosave-melding. Vergadertijd/bijzonderheden definitief weg (stond nog in de oude live versie die Rogier zag; v4-deploy vervangt alles).
- [ ] **Follow-up dashboard**: `extra_documents` renderen in de asset-lijst (nu alleen geteld via `getUploadCount`, niet getoond) zodat multi-uploads + klantcases/contentstrategie-docs zichtbaar zijn.
- [ ] **Follow-up n8n**: `Sync uploads -> Drive` uitbreiden met `extra_documents` zodat die docs ook in de klant-Drive-folder belanden (nu staan ze wel veilig in Supabase storage).
- [ ] **Vault-link Sebas-advies**: voor interne opslag van ontvangen credentials iets als Bitwarden/1Password (geen Google Sheet). Open one-time-link pas als je 'm meteen kunt opslaan.
- [ ] Optioneel: screenshot in de mail (vereist gehoste image-URL); interne "open-link-pas-bij-opslaan"-note evt. in de notify-taak; standalone form-project deprecaten na evt. dashboard-consolidatie.
- [ ] Een paar "ZZ TEST"-Gmail-drafts handmatig weggooien (van de testruns).

## Sessie 2026-06-10 (avond) - Drive-sync ROOT CAUSE + herbouw + dashboard-assets
- **Root cause "bestanden niet in Drive"**: de n8n-instance ondersteunt `helpers.httpRequestWithAuthentication` NIET meer in Code-nodes (sinds een instance-update; foutmelding letterlijk in de sync_log van executie 333637). Daardoor faalden `Sync uploads → Drive` EN `Copy templates` stil: bestanden bleven wel veilig in Supabase-storage, maar kwamen nooit in Drive. (Executions worden tegenwoordig WEL bewaard, retentie-fix 2026-06-05; debug kan dus via `GET /api/v1/executions/{id}?includeData=true`.)
- **Herbouw (PUT 2026-06-10, 41 nodes, live)**: beide Code-API-nodes vervangen door echte nodes als ZIJ-TAKKEN van de hoofdketen (lege tak stopt de flow nooit meer): (a) file-sync: `Build sync batch` (Code, puur) -> `Storage: download upload` (HTTP, supabaseApi, binary) -> `Drive: upload klant-doc` (Drive-node) -> `Aggregate sync result` -> `Update intake — drive_links`. Mapping: logo/brand_document -> "02 - Branding", pitch_deck -> "01 - Briefing & Strategie"; extra_documents op note: Logo/Brand guide -> 02, Pitch deck/Klantcases -> 01, Contentstrategie -> "05 - Content", anders -> "00 - Onboarding". (b) template-kopie: Drive API list subfolders -> match op naam -> list files -> copy per bestand. Hoofdketen nu: Aggregate Drive result -> intake-summary -> ... -> Log: drive_created -> ClickUp: create space. `Aggregate clickup result` leest ctx nu uit `Aggregate Drive result` (altijd gedraaid).
- **dfbdsfb-run (15:41 UTC)**: was GEEN crash maar handmatig GEANNULEERD (execution 333676 status canceled, na 10s) -> daarom geen Slack-alert en status `received`. Mogelijk zwerft er een halve Drive-folder "dfbdsfb" rond; row + folder nog opruimen.
- **Reflow recruitment (Rogiers test, 15:19)**: bestanden staan in storage maar (door de bug) niet in Drive; drive_links leeg. Nieuwe submissie synct wel.
- **Dashboard** (commit e1ac92d, build groen): logo toegevoegd aan de uploads-lijst (ontbrak!); `extra_documents` worden getoond; storage-links via nieuwe route `/admin/klanten/[id]/asset?path=...` (verse signed URL per klik + redirect) -> geen `InvalidJWT exp`-fouten meer.
- **Standaarddocumenten voor elke klant**: mechanisme = bestanden in de Drive-template-folder "Nobox Klant Template" (`1sv2Yfdauw2WlcnyfoT75UqgYNvBAx1x6`) subfolders zetten; de flow kopieert ze 1-op-1 naar de klant-subfolders (na de herbouw werkt dit ook echt). Geen n8n-wijziging nodig per nieuw document.
- **Interne tools-sectie dashboard**: blijft staan (Rogiers keuze, optioneel handmatig voor Sebas).

## Sessie 2026-06-10 (avond, vervolg) - dashboard volledig afgestemd op form v4
- **n8n notify-taak** (live, PUT): description bevat nu bovenaan de links een directe **dashboard-link** `https://nbx-dashboard.vercel.app/admin/klanten/{intake_id}` naast Drive + ClickUp-space; de geschrapte vergadertijd-regel is eruit.
- **Dashboard** (commit na e1ac92d, build groen): (a) Bedrijf-sectie + bedrijfsemail/factuuradres/factuur_email (form verzamelt ze, dashboard toonde ze niet); (b) dubbele concurrenten weg uit Diensten & doelen; (c) **platform-toegangen**: alleen actieve platforms zichtbaar, rest achter "Niet actief (N) — tonen of toevoegen"-uitklapper; (d) klantcases + contentstrategie: tekst EN document-upload (UPLOADABLE_ASSETS uitgebreid; kolommen incl. mime/size bestonden al); (e) dubbele "Overige documenten"-sectie (zonder werkende links) verwijderd, extra_documents staan in de Uploads-lijst met verse links; (f) **Praktisch-sectie verwijderd** (vergadervoorkeur + bijzonderheden, form vraagt ze niet meer; kolommen blijven in DB).

## Sessie 2026-06-10 (laat) - submit-gate fix + klanten-archief
- **Submit-gate (form, commit 791f79c)**: het `<form>` verstuurde bij een Enter-toets in een veld (browser-default) en sloeg de controle-stap over -> automation startte ongewild. Fix: `onSubmit` verzendt alleen op de laatste stap (anders -> `next()`), en `onKeyDown` blokkeert Enter-submit op niet-laatste stappen (textarea uitgezonderd). Enige weg naar submit = bewust op "Verstuur intake" op de controle-stap.
- **Klanten-archiveren (dashboard)**: nieuwe kolom `onboarding_intakes.archived_at timestamptz` (null = actief). Server-acties `archiveIntake`/`unarchiveIntake` (actions.ts). Overzicht splitst actief vs archief: standaard alleen actieve klanten + tellers/nav op actief; "Archief (N)"-toggle (`?archief=1`) toont het archief met "Herstel"-knoppen. `ArchiveButton`-component op elke kaart (stopPropagation ivm de absolute kaart-Link). Niet verwijderd, alleen verborgen.

## Quirks / lessons (technisch, voor een nieuwe sessie)
- **`helpers.httpRequestWithAuthentication` werkt NIET (meer) in n8n Code-nodes op deze instance** (geldt voor ALLE credentials, niet alleen ClickUp). Authenticated calls altijd via HTTP Request-nodes met `predefinedCredentialType` of dedicated nodes. Executions zijn nu wel opvraagbaar via de API (retentie 30 dagen) - debug daarmee i.p.v. alleen Supabase-logs.
- **n8n PUT**: body mag ALLEEN `name, nodes, connections, settings`. `settings.binaryMode` wordt geweigerd (400) -> strippen; n8n herstelt het server-side als instance-default. Gebruik `settings:{executionOrder:'v1', errorWorkflow:'LaW53wYFdkR9TJle'}`.
- **Encoding**: workflow-naam heeft emoji 🦸/🌌, node-namen hebben `—`/`→`. Lees/schrijf via bestand met expliciet `encoding='utf-8'`, `json.dump(..., ensure_ascii=False)`, geen BOM, `curl --data-binary`. Nooit `curl | python` via stdin op Windows (cp1252). Verifieer naam-codepoint na PUT.
- **ClickUp statussen NIET via API zetbaar** (alleen via een List Template). Een *status*-template (UI-feature) is niet via API toepasbaar; een *List* template wel.
- **`createSpaceListFromTemplate`**: `POST /api/v2/space/{space_id}/list_template/{t-id}`, body `{name, options:{return_immediately:false}}`. `GetListTemplates` = `GET /api/v2/team/{team_id}/list_template`. Opnieuw opslaan van een template behoudt het `t-`ID.
- **Geen ClickUp-MCP** -> webhook-helper-truc: maak tijdelijke n8n-workflow (Webhook -> HTTP Request met `clickUpOAuth2Api`/`googleDriveOAuth2Api` -> Respond), activeer, `curl` de webhook, verwijder daarna de workflow. (ClickUp-auth werkt NIET in een Code-node; gebruik HTTP Request-nodes met `predefinedCredentialType`.)
- **n8n executions worden NIET bewaard** op deze instance -> debug de flow via Supabase `onboarding_intake_logs` (events: `drive_created` -> `clickup_created` -> `mails_sent`, of `*_failed`).
- **Supabase-MCP**: moet op org `axtiqcjhrgvfcwqhvseg` staan om `djarvwzvbxlcnxkxczpc` te bereiken.
- **Test-aanpak**: maak een test-row in `onboarding_intakes`, vuur de webhook, lees voortgang via de logs; ruim daarna ClickUp-space + notify-taak + Drive-folder + row op (Gmail-draft handmatig).

## Verwante bestanden
- Wiki (canoniek): `wiki/Nobox onboarding flow.md`, `wiki/_Log.md`.
- Form-builder (geparkeerd, volledige uitwerking): `docs/form-builder-geparkeerd.md`.
- Project: `frontend/.env.local` (secrets), `src/lib/schema.ts` (form-shape v3), `src/app/api/submit/route.ts` (entry), `src/lib/database.types.ts` (DB-types, deels verouderd).
