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

export const schema = z.object({
  // Sectie 1 — Bedrijf & administratie
  bedrijfsnaam: z.string().trim().min(2, "Bedrijfsnaam is verplicht"),
  bedrijfsemail: z.string().trim().email("Geen geldig e-mailadres"),
  website: optionalUrl,
  factuuradres: z.string().trim().optional(),
  factuur_email: optionalEmail,
  concurrenten: z.string().trim().optional(),

  // Sectie 2 — Platform-toegangen
  google_ads: z.object({
    has: z.boolean(),
    customer_id: z.string().trim().optional(),
    owner_email: optionalEmail,
    wil_opzetten: z.boolean().optional(),
  }),
  search_console: z.object({
    has: z.boolean(),
    owner_email: optionalEmail,
  }),
  ga4: z.object({
    has: z.boolean(),
    property_id: z.string().trim().optional(),
    owner_email: optionalEmail,
  }),
  meta_business: z.object({
    has: z.boolean(),
    business_manager_id: z.string().trim().optional(),
  }),
  linkedin: z.object({
    has: z.boolean(),
    owner_email: optionalEmail,
  }),
  instagram: z.object({
    has: z.boolean(),
    owner_email_or_handle: z.string().trim().optional(),
  }),
  website_cms: z.object({
    cms_type: z.string().trim().optional(),
    cms_other: z.string().trim().optional(),
    owner_email: optionalEmail,
  }),
  overige_platforms: z.string().trim().optional(),

  // Sectie 3 — Wachtwoorden & logins (info-only, geen velden)

  // Sectie 4 — Branding & content
  logo: fileUpload,
  branding: fileUpload.extend({
    notes: z.string().trim().optional(),
  }),
  pitch_deck: fileUpload,
  // Extra logo's / brand-assets (meerdere bestanden) -> komen in extra_documents
  brand_assets: z.array(fileUpload).optional(),
  brand_color_hex: optionalHex,
  brand_secondary_hex: optionalHex,
  brand_accent_hex: optionalHex,
  foto_video_drive_link: optionalUrl,
  klantcases_text: z.string().trim().optional(),
  klantcases_document: fileUpload,
  contentstrategie_text: z.string().trim().optional(),
  contentstrategie_document: fileUpload,
});

export type FormData = z.infer<typeof schema>;

const emptyFile = {
  document_filename: "",
  document_data: "",
  document_size: 0,
  document_mime: "",
};

export const defaultValues: FormData = {
  bedrijfsnaam: "",
  bedrijfsemail: "",
  website: "",
  factuuradres: "",
  factuur_email: "",
  concurrenten: "",
  google_ads: { has: false, customer_id: "", owner_email: "", wil_opzetten: false },
  search_console: { has: false, owner_email: "" },
  ga4: { has: false, property_id: "", owner_email: "" },
  meta_business: { has: false, business_manager_id: "" },
  linkedin: { has: false, owner_email: "" },
  instagram: { has: false, owner_email_or_handle: "" },
  website_cms: { cms_type: "", cms_other: "", owner_email: "" },
  overige_platforms: "",
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
  ["bedrijfsnaam", "bedrijfsemail", "website", "factuuradres", "factuur_email", "concurrenten"],
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
    "linkedin.owner_email",
    "instagram.has",
    "instagram.owner_email_or_handle",
    "website_cms.cms_type",
    "website_cms.cms_other",
    "website_cms.owner_email",
    "overige_platforms",
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
// Optionele Tango-walkthrough (screenshots). Nu NIET in de UI getoond: de
// onetimesecret-pagina is self-explanatory en de screenshots kunnen verouderen.
export const TANGO_GUIDE_URL =
  "https://app.tango.us/app/workflow/Create-Secret-Link-for-Europe-0c7898da693e47e6b6b8e98e454abc64";
