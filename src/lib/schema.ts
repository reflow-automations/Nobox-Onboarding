import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v || v === "") return undefined;
    const stripped = v.replace(/^https?:\/\//i, "");
    return `https://${stripped}`;
  })
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return /\./.test(u.hostname);
    } catch {
      return false;
    }
  }, "Vul een geldig domein in (bv. acme.nl of www.acme.nl)");

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Geen geldig e-mailadres"
  );

const optionalHex = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) => !v || v === "" || /^#[0-9A-Fa-f]{3,8}$/.test(v),
    "Geldig hex-formaat: #E6FB7C of #000"
  );

const fileUpload = z.object({
  document_filename: z.string().optional(),
  document_data: z.string().optional(),
  document_size: z.number().optional(),
  document_mime: z.string().optional(),
});

// Contactpersonen: naam, e-mail en functie verplicht (afspraak meeting 2026-06-11).
// clickup_toegang bepaalt wie n8n straks als gast uitnodigt in de ClickUp-space.
const contactpersoonSchema = z.object({
  voornaam: z.string().trim().min(1, "Voornaam is verplicht"),
  achternaam: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, "E-mail is verplicht")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Geen geldig e-mailadres"),
  functie: z.string().trim().min(1, "Functie is verplicht"),
  clickup_toegang: z.boolean().optional(),
});

export type Contactpersoon = z.infer<typeof contactpersoonSchema>;

export const schema = z.object({
  // Sectie 1 — Bedrijf & administratie
  bedrijfsnaam: z.string().trim().min(2, "Bedrijfsnaam is verplicht"),
  bedrijfsemail: z.string().trim().email("Geen geldig e-mailadres"),
  website: optionalUrl,
  contactpersonen: z
    .array(contactpersoonSchema)
    .min(1, "Voeg minstens één contactpersoon toe"),
  factuuradres: z.string().trim().optional(),
  factuur_email: optionalEmail,
  concurrenten: z.string().trim().optional(),

  // Sectie 2 — Platform-toegangen
  // toegevoegd = de klant vinkt aan dat hij de actie (ons uitnodigen/koppelen)
  // heeft gedaan. Zelf-gerapporteerd; dashboard toont het als signaal.
  google_ads: z.object({
    has: z.boolean(),
    customer_id: z.string().trim().optional(),
    owner_email: optionalEmail,
    wil_opzetten: z.boolean().optional(),
    toegevoegd: z.boolean().optional(),
  }),
  search_console: z.object({
    has: z.boolean(),
    owner_email: optionalEmail,
    toegevoegd: z.boolean().optional(),
  }),
  ga4: z.object({
    has: z.boolean(),
    property_id: z.string().trim().optional(),
    owner_email: optionalEmail,
    toegevoegd: z.boolean().optional(),
  }),
  meta_business: z.object({
    has: z.boolean(),
    business_manager_id: z.string().trim().optional(),
    toegevoegd: z.boolean().optional(),
  }),
  linkedin: z.object({
    has: z.boolean(),
    // LinkedIn kent geen invite-per-e-mail: Nobox volgt eerst de bedrijfspagina,
    // daarna voegt de klant een persoon (profiel) toe als beheerder.
    company_page: z.string().trim().optional(),
    owner_email: optionalEmail,
    toegevoegd: z.boolean().optional(),
  }),
  instagram: z.object({
    has: z.boolean(),
    owner_email_or_handle: z.string().trim().optional(),
    toegevoegd: z.boolean().optional(),
  }),
  website_cms: z.object({
    has: z.boolean().optional(),
    cms_type: z.string().trim().optional(),
    cms_other: z.string().trim().optional(),
    owner_email: optionalEmail,
    toegevoegd: z.boolean().optional(),
  }),
  overige_platforms: z.string().trim().optional(),
  // Interne tools (ATS, CRM, Leadinfo, etc.) — helpt Nobox om toegang te plannen.
  internal_tools: z.string().trim().optional(),

  // Sectie 3 — Wachtwoorden & logins (info-only, geen velden)

  // Sectie 4 — Branding & content
  logo: fileUpload,
  branding: fileUpload.extend({
    notes: z.string().trim().optional(),
  }),
  pitch_deck: fileUpload,
  // Extra bestanden per upload-groep (meerdere mogelijk) -> komen in extra_documents
  brand_assets: z.array(fileUpload.extend({ note: z.string().optional() })).optional(),
  brand_color_hex: optionalHex,
  brand_secondary_hex: optionalHex,
  brand_accent_hex: optionalHex,
  foto_video_drive_link: optionalUrl,
  klantcases_text: z.string().trim().optional(),
  klantcases_document: fileUpload,
  contentstrategie_text: z.string().trim().optional(),
  contentstrategie_document: fileUpload,
})
  // Conditionele verplichting (afspraak meeting 2026-06-11): zegt de klant "ja"
  // op een platform, dan zijn de bijbehorende velden verplicht. Anders heeft de
  // ja-antwoord geen waarde en moet alles later alsnog nagevraagd worden.
  .superRefine((v, ctx) => {
    const req = (cond: boolean, value: string | undefined, path: string[], msg: string) => {
      if (cond && (!value || value.trim() === "")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: msg });
      }
    };
    req(
      v.google_ads.has,
      v.google_ads.customer_id,
      ["google_ads", "customer_id"],
      "Customer ID is verplicht als je Google Ads hebt"
    );
    req(
      v.google_ads.has,
      v.google_ads.owner_email,
      ["google_ads", "owner_email"],
      "E-mail van de accounteigenaar is verplicht"
    );
    // Search Console: alleen toevoegen, we hebben verder niks van de klant nodig.
    req(
      v.ga4.has,
      v.ga4.property_id,
      ["ga4", "property_id"],
      "Property ID is verplicht als je GA4 hebt"
    );
    req(
      v.linkedin.has,
      v.linkedin.company_page,
      ["linkedin", "company_page"],
      "Naam of URL van jullie bedrijfspagina is verplicht"
    );
    req(
      v.instagram.has,
      v.instagram.owner_email_or_handle,
      ["instagram", "owner_email_or_handle"],
      "Vul je @gebruikersnaam of e-mailadres in"
    );
    req(
      v.website_cms.has === true,
      v.website_cms.cms_type,
      ["website_cms", "cms_type"],
      "Kies welk CMS jullie gebruiken"
    );
    req(
      v.website_cms.has === true && v.website_cms.cms_type === "Anders",
      v.website_cms.cms_other,
      ["website_cms", "cms_other"],
      "Vul in welk CMS jullie gebruiken"
    );
  });

export type FormData = z.infer<typeof schema>;

const emptyFile = {
  document_filename: "",
  document_data: "",
  document_size: 0,
  document_mime: "",
};

export const emptyContactpersoon: Contactpersoon = {
  voornaam: "",
  achternaam: "",
  email: "",
  functie: "",
  clickup_toegang: true,
};

export const defaultValues: FormData = {
  bedrijfsnaam: "",
  bedrijfsemail: "",
  website: "",
  contactpersonen: [{ ...emptyContactpersoon }],
  factuuradres: "",
  factuur_email: "",
  concurrenten: "",
  google_ads: { has: false, customer_id: "", owner_email: "", wil_opzetten: false, toegevoegd: false },
  search_console: { has: false, owner_email: "", toegevoegd: false },
  ga4: { has: false, property_id: "", owner_email: "", toegevoegd: false },
  meta_business: { has: false, business_manager_id: "", toegevoegd: false },
  linkedin: { has: false, company_page: "", owner_email: "", toegevoegd: false },
  instagram: { has: false, owner_email_or_handle: "", toegevoegd: false },
  website_cms: { has: false, cms_type: "", cms_other: "", owner_email: "", toegevoegd: false },
  overige_platforms: "",
  internal_tools: "",
  logo: { ...emptyFile },
  branding: { ...emptyFile, notes: "" },
  pitch_deck: { ...emptyFile },
  brand_assets: [],
  brand_color_hex: "",
  brand_secondary_hex: "",
  brand_accent_hex: "",
  foto_video_drive_link: "",
  klantcases_text: "",
  klantcases_document: { ...emptyFile },
  contentstrategie_text: "",
  contentstrategie_document: { ...emptyFile },
};

export const sectionFieldsByStep: ReadonlyArray<ReadonlyArray<string>> = [
  // 0 — Bedrijf & administratie
  [
    "bedrijfsnaam",
    "bedrijfsemail",
    "website",
    "contactpersonen",
    "factuuradres",
    "factuur_email",
    "concurrenten",
  ],
  // 1 — Platform-toegangen
  [
    "google_ads.has",
    "google_ads.customer_id",
    "google_ads.owner_email",
    "google_ads.wil_opzetten",
    "search_console.has",
    "search_console.owner_email",
    "ga4.has",
    "ga4.property_id",
    "ga4.owner_email",
    "meta_business.has",
    "meta_business.business_manager_id",
    "linkedin.has",
    "linkedin.company_page",
    "linkedin.owner_email",
    "instagram.has",
    "instagram.owner_email_or_handle",
    "website_cms.has",
    "website_cms.cms_type",
    "website_cms.cms_other",
    "website_cms.owner_email",
    "overige_platforms",
    "internal_tools",
  ],
  // 2 — Wachtwoorden & logins (info-block, no fields)
  [],
  // 3 — Branding & content (laatste stap)
  [
    "logo.document_filename",
    "logo.document_data",
    "branding.document_filename",
    "branding.document_data",
    "branding.notes",
    "pitch_deck.document_filename",
    "pitch_deck.document_data",
    "brand_color_hex",
    "brand_secondary_hex",
    "brand_accent_hex",
    "foto_video_drive_link",
    "klantcases_text",
    "klantcases_document.document_filename",
    "contentstrategie_text",
    "contentstrategie_document.document_filename",
  ],
  // 4 — Controleren & verzenden (geen validatie-velden)
  [],
];

export const sectionTitles = [
  "Jullie bedrijf",
  "Platform-toegangen",
  "Wachtwoorden & logins",
  "Branding & content",
  "Controleren",
] as const;

// Centrale links voor de credential-uitleg (sectie 3 + welkomstmail).
// onetimesecret EU-regio: de pagina spreekt voor zich, dit is de primaire link.
export const ONETIMESECRET_URL = "https://eu.onetimesecret.com";
// Adres dat de klant moet toevoegen voor gedelegeerde toegang.
export const MARKETING_EMAIL = "marketing@noboxagency.com";
// Nobox's eigen Meta Business Manager-ID, getoond in de Meta-uitleg.
// Leeg = formulier verwijst naar de welkomstmail. TODO: invullen zodra bekend (Rogier/Sebas).
export const NOBOX_BM_ID = "";
// Optionele Tango-walkthrough (screenshots). Nu NIET in de UI getoond: de
// onetimesecret-pagina is self-explanatory en de screenshots kunnen verouderen.
export const TANGO_GUIDE_URL =
  "https://app.tango.us/app/workflow/Create-Secret-Link-for-Europe-0c7898da693e47e6b6b8e98e454abc64";
