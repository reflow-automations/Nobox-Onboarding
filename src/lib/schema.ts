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

export const schema = z.object({
  // Sectie 1 — Bedrijf (kvk + adres geschrapt, staan in offerte)
  bedrijfsnaam: z.string().trim().min(2, "Bedrijfsnaam is verplicht"),
  website: optionalUrl,

  // Sectie 2 — Contactpersoon (singular voor v2; admin kan extra contacten toevoegen in dashboard)
  contactpersoon: z.object({
    voornaam: z.string().trim().min(1, "Voornaam is verplicht"),
    achternaam: z.string().trim().min(1, "Achternaam is verplicht"),
    functie: z.string().trim().min(1, "Functie is verplicht"),
    email: z.string().trim().email("Geen geldig e-mailadres"),
    telefoon: z.string().trim().optional(),
    linkedin: optionalUrl,
  }),

  // Sectie 3 — Doelen + diensten
  diensten: z
    .array(
      z.enum([
        "SEO",
        "SEA",
        "Content",
        "Social",
        "Web",
        "Branding",
        "Strategie",
        "Anders",
      ])
    )
    .min(1, "Kies minstens één dienst"),
  doelen: z.object({
    hoofddoel: z.string().trim().min(10, "Schrijf minstens één zin (10+ tekens)"),
    kpis: z.string().trim().optional(),
    concurrenten: z.string().trim().optional(),
  }),

  // Sectie 4 — Platform-toegangen
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

  // Sectie 4b — Interne tools (context, geen toegang)
  internal_tools: z.string().trim().optional(),

  // Sectie 5 — Vault info-only (geen velden)

  // Sectie 6 — Branding & content
  branding: z.object({
    document_filename: z.string().optional(),
    document_data: z.string().optional(),
    document_size: z.number().optional(),
    document_mime: z.string().optional(),
    notes: z.string().trim().optional(),
  }),
  pitch_deck: z.object({
    document_filename: z.string().optional(),
    document_data: z.string().optional(),
    document_size: z.number().optional(),
    document_mime: z.string().optional(),
  }),
  brand_color_hex: optionalHex,
  tone_of_voice: z.enum(["formeel", "informeel", "mix", ""]).optional(),
  foto_video_drive_link: optionalUrl,
  klantcases_text: z.string().trim().optional(),
  contentstrategie_text: z.string().trim().optional(),

  // Sectie 7 — Praktisch (gewenste_startdatum geschrapt, in offerte)
  voorkeur_vergader_tijd: z.enum(["ochtend", "middag", "avond", "flexibel"]),
  bijzonderheden: z.string().trim().optional(),
});

export type FormData = z.infer<typeof schema>;

export const defaultValues: FormData = {
  bedrijfsnaam: "",
  website: "",
  contactpersoon: {
    voornaam: "",
    achternaam: "",
    functie: "",
    email: "",
    telefoon: "",
    linkedin: "",
  },
  diensten: [],
  doelen: { hoofddoel: "", kpis: "", concurrenten: "" },
  google_ads: { has: false, customer_id: "", owner_email: "", wil_opzetten: false },
  search_console: { has: false, owner_email: "" },
  ga4: { has: false, property_id: "", owner_email: "" },
  meta_business: { has: false, business_manager_id: "" },
  linkedin: { has: false, owner_email: "" },
  instagram: { has: false, owner_email_or_handle: "" },
  website_cms: { cms_type: "", cms_other: "", owner_email: "" },
  overige_platforms: "",
  internal_tools: "",
  branding: {
    document_filename: "",
    document_data: "",
    document_size: 0,
    document_mime: "",
    notes: "",
  },
  pitch_deck: {
    document_filename: "",
    document_data: "",
    document_size: 0,
    document_mime: "",
  },
  brand_color_hex: "",
  tone_of_voice: "",
  foto_video_drive_link: "",
  klantcases_text: "",
  contentstrategie_text: "",
  voorkeur_vergader_tijd: "flexibel",
  bijzonderheden: "",
};

export const sectionFieldsByStep: ReadonlyArray<ReadonlyArray<string>> = [
  // 0 — Bedrijf
  ["bedrijfsnaam", "website"],
  // 1 — Contactpersoon
  [
    "contactpersoon.voornaam",
    "contactpersoon.achternaam",
    "contactpersoon.functie",
    "contactpersoon.email",
    "contactpersoon.telefoon",
    "contactpersoon.linkedin",
  ],
  // 2 — Doelen & diensten
  ["diensten", "doelen.hoofddoel", "doelen.kpis", "doelen.concurrenten"],
  // 3 — Platforms + interne tools
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
    "internal_tools",
  ],
  // 4 — Vault info-block (no fields)
  [],
  // 5 — Branding & content
  [
    "branding.document_filename",
    "branding.document_data",
    "branding.notes",
    "pitch_deck.document_filename",
    "pitch_deck.document_data",
    "brand_color_hex",
    "tone_of_voice",
    "foto_video_drive_link",
    "klantcases_text",
    "contentstrategie_text",
  ],
  // 6 — Praktisch
  ["voorkeur_vergader_tijd", "bijzonderheden"],
];

export const sectionTitles = [
  "Jullie bedrijf",
  "Contactpersoon",
  "Doelen & diensten",
  "Platform-toegangen",
  "Wachtwoorden & logins",
  "Branding & content",
  "Praktisch",
] as const;

export const dienstenOptions = [
  "SEO",
  "SEA",
  "Content",
  "Social",
  "Web",
  "Branding",
  "Strategie",
  "Anders",
] as const;

// Centrale vault-URL — vervang door echte Bitwarden Send / 1Password share-pagina URL wanneer Sebas die heeft.
export const VAULT_URL = "https://noboxagency.com/vault";
