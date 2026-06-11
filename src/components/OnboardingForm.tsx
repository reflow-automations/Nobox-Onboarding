"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFormContext, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  schema,
  defaultValues,
  emptyContactpersoon,
  sectionFieldsByStep,
  sectionTitles,
  ONETIMESECRET_URL,
  MARKETING_EMAIL,
  NOBOX_BM_ID,
  type FormData,
} from "@/lib/schema";
import {
  KickerDot,
  ArrowSlideButton,
  ArrowSlideLink,
  ArrowLeft,
  InfoDropdown,
} from "./ui";

const STORAGE_KEY = "nbx-onboarding-draft-v4";
// v3 had losse contact_voornaam/-achternaam/-email velden; v4 heeft contactpersonen[].
const LEGACY_STORAGE_KEY = "nbx-onboarding-draft-v3";
const STEPS = sectionTitles.length;

/** Migreer een v3-draft (los contactveld) naar de v4-vorm (contactpersonen-array). */
function migrateLegacyDraft(parsed: Record<string, unknown>): Record<string, unknown> {
  const voornaam = typeof parsed.contact_voornaam === "string" ? parsed.contact_voornaam : "";
  const achternaam = typeof parsed.contact_achternaam === "string" ? parsed.contact_achternaam : "";
  const email = typeof parsed.contact_email === "string" ? parsed.contact_email : "";
  const migrated: Record<string, unknown> = { ...parsed };
  delete migrated.contact_voornaam;
  delete migrated.contact_achternaam;
  delete migrated.contact_email;
  if (voornaam || achternaam || email) {
    migrated.contactpersonen = [
      { ...emptyContactpersoon, voornaam, achternaam, email },
    ];
  }
  return migrated;
}

const sectionSubtitles = [
  "Even kennismaken: bedrijfsinfo + factuur.",
  "Welke marketing-platforms gebruiken jullie?",
  "Hoe je ons straks veilig toegang geeft.",
  "Brand assets: alles optioneel, alles welkom.",
  "Klopt alles? Verstuur 'm dan.",
] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Ankerpunt: top van het echte formulier (voorbij de welkom-hero).
  const formTopRef = useRef<HTMLDivElement>(null);

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        methods.reset({ ...defaultValues, ...parsed });
      } else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const migrated = migrateLegacyDraft(JSON.parse(legacy));
          methods.reset({ ...defaultValues, ...migrated });
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [methods]);

  useEffect(() => {
    const sub = methods.watch((data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore quota issues */
      }
    });
    return () => sub.unsubscribe();
  }, [methods]);

  // Bij stapwissel direct bij de eerste vraag landen i.p.v. bovenaan de pagina.
  // Dit MOET na de re-render gebeuren (de welkom-hero op stap 1 is dan al uit de
  // DOM), anders meet scrollIntoView de oude layout en land je verkeerd.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (step === 0) {
      // Terug naar stap 1: naar de top zodat de welkom-hero weer in beeld komt.
      window.scrollTo(0, 0);
      return;
    }
    // Na de paint scrollen (de stap-kaart heeft een fade-up-animatie; meten
    // tijdens die reflow gaf een driftende eindpositie). Absolute offset i.p.v.
    // scrollIntoView, zodat we elke stap op exact dezelfde hoogte landen.
    requestAnimationFrame(() => {
      const el = formTopRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo(0, Math.max(0, y));
    });
  }, [step]);

  const next = async () => {
    const fields = sectionFieldsByStep[step] as Parameters<typeof methods.trigger>[0];
    const valid = await methods.trigger(fields);
    if (valid && step < STEPS - 1) {
      setStep((s) => s + 1);
    } else if (!valid) {
      requestAnimationFrame(() => {
        document
          .querySelector(".nbx-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const onSubmit = methods.handleSubmit(async (data) => {
    // Harde gate: alleen echt verzenden vanaf de laatste (controle-)stap.
    // Vangt o.a. een Enter-toets in een veld op, zodat de automation nooit
    // start voordat de klant bewust op "Verstuur intake" heeft gedrukt.
    if (step < STEPS - 1) {
      await next();
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.reference_id) {
        localStorage.removeItem(STORAGE_KEY);
        router.push("/success");
      } else {
        setSubmitError(json?.error ?? `Versturen mislukt (HTTP ${res.status})`);
        setSubmitting(false);
      }
    } catch (e) {
      setSubmitError(String(e));
      setSubmitting(false);
    }
  });

  const stepLabel = String(step + 1).padStart(2, "0");
  const totalLabel = String(STEPS).padStart(2, "0");

  return (
    <FormProvider {...methods}>
      {submitting && (
        <div className="fixed inset-0 z-50 bg-nbx-bg/85 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="text-center px-6">
            <div className="mb-7 flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-[3px] border-nbx-text/10" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-nbx-text animate-spin" />
              </div>
            </div>
            <KickerDot className="mb-3">Even geduld</KickerDot>
            <p className="font-cabinet text-3xl sm:text-4xl">
              We zetten alles voor je klaar.
            </p>
          </div>
        </div>
      )}
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          // Enter in een veld mag het formulier NOOIT verzenden, ook niet op de
          // controle-stap: verzenden kan alleen via een bewuste klik (of Enter)
          // op de "Verstuur intake"-knop zelf. Textarea houdt Enter als newline.
          const tag = (e.target as HTMLElement).tagName;
          if (e.key === "Enter" && tag !== "TEXTAREA" && tag !== "BUTTON") {
            e.preventDefault();
          }
        }}
        noValidate
      >
        {/* Welkom-hero: alleen op de eerste stap. Daarna weg, zodat de klant bij
            stapwissel direct bij de eerstvolgende vraag begint i.p.v. eerst langs
            deze intro te scrollen (review-meeting 2026-06-11). */}
        {step === 0 && (
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
              Drive-map, taken, toegangsverzoeken en de eerste mails, zonder dat
              jullie iets twee keer hoeven typen.
            </p>
          </section>
        )}

        {/* Progress kicker + segmented bar (ankerpunt voor scroll bij stapwissel) */}
        <div ref={formTopRef} className="mb-6 sm:mb-8 scroll-mt-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <KickerDot>
              Stap {stepLabel} — {sectionTitles[step]}
            </KickerDot>
            <span className="nbx-kicker flex-shrink-0">
              {stepLabel} / {totalLabel}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div
                key={i}
                className={`nbx-step-segment ${
                  i < step
                    ? "nbx-step-segment-done"
                    : i === step
                    ? "nbx-step-segment-current"
                    : ""
                }`}
                aria-current={i === step ? "step" : undefined}
              />
            ))}
          </div>
        </div>

        {/* Section card */}
        <div className="nbx-card mb-8 overflow-hidden">
          <span aria-hidden className="nbx-watermark-number top-2 right-4 sm:top-4 sm:right-8">
            {stepLabel}
          </span>

          <div key={step} className="animate-fade-up relative">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3">
              {sectionTitles[step]}
              <span className="text-nbx-green">.</span>
            </h2>
            <p className="text-nbx-text/55 text-sm sm:text-base mb-8 sm:mb-10 max-w-md">
              {sectionSubtitles[step]}
            </p>

            <div className="space-y-5 sm:space-y-6">
              {step === 0 && <Section1Bedrijf />}
              {step === 1 && <Section2Platforms />}
              {step === 2 && <Section3Vault />}
              {step === 3 && <Section4Branding />}
              {step === 4 && <Section5Review />}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="rounded-2xl bg-red-50/90 backdrop-blur-sm border border-red-200 p-4 mb-6 animate-fade-up">
            <div className="flex gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
                <circle cx="10" cy="10" r="9" stroke="#dc2626" strokeWidth="1.5" />
                <path d="M10 5V11M10 14V14.5" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <p className="text-red-800 text-sm leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0 || submitting}
            className="nbx-btn-secondary"
          >
            <ArrowLeft />
            Vorige
          </button>

          {step < STEPS - 1 ? (
            <ArrowSlideButton onClick={next} variant="primary">
              Volgende
            </ArrowSlideButton>
          ) : (
            <ArrowSlideButton type="submit" disabled={submitting} variant="green">
              {submitting ? "Versturen…" : "Verstuur intake"}
            </ArrowSlideButton>
          )}
        </div>
        <p className="text-center text-xs text-nbx-text/40 mt-4">
          Je antwoorden worden automatisch in je browser bewaard. Later verdergaan kan
          gewoon.
        </p>
      </form>
    </FormProvider>
  );
}

// ----- Reusable field components -----

function FieldText({
  name,
  label,
  type = "text",
  placeholder,
  required,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormData>();
  const err = getNestedError(errors as Record<string, unknown>, name);
  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="nbx-input"
        {...register(name as never)}
      />
      {hint && <p className="text-xs text-nbx-text/55 mt-1.5">{hint}</p>}
      {err && <p className="nbx-error">{err}</p>}
    </div>
  );
}

function FieldTextarea({
  name,
  label,
  placeholder,
  required,
  rows = 4,
  hint,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  hint?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormData>();
  const err = getNestedError(errors as Record<string, unknown>, name);
  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className="nbx-textarea"
        {...register(name as never)}
      />
      {hint && <p className="text-xs text-nbx-text/55 mt-1.5">{hint}</p>}
      {err && <p className="nbx-error">{err}</p>}
    </div>
  );
}

function FieldSelect({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormData>();
  const err = getNestedError(errors as Record<string, unknown>, name);
  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select className="nbx-input" {...register(name as never)}>
        <option value="">Kies…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {err && <p className="nbx-error">{err}</p>}
    </div>
  );
}

function FieldYesNo({ name, label }: { name: string; label: string }) {
  const { setValue, watch } = useFormContext<FormData>();
  const value = watch(name as never) as unknown as boolean | undefined;
  const click = (v: boolean) =>
    setValue(name as never, v as never, { shouldValidate: true, shouldDirty: true });
  return (
    <div>
      <label className="nbx-field-label">{label}</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => click(true)}
          className={`nbx-check-pill ${value === true ? "nbx-check-pill-active" : ""}`}
        >
          Ja
        </button>
        <button
          type="button"
          onClick={() => click(false)}
          className={`nbx-check-pill ${value === false ? "nbx-check-pill-active" : ""}`}
        >
          Nee
        </button>
      </div>
    </div>
  );
}

function FieldFile({
  namePrefix,
  label,
  accept,
  maxMB = 3,
  required = false,
  hint,
}: {
  namePrefix: string;
  label: string;
  accept: string;
  maxMB?: number;
  required?: boolean;
  hint?: string;
}) {
  const { setValue, watch } = useFormContext<FormData>();
  const filename = (watch(
    `${namePrefix}.document_filename` as never
  ) as unknown as string) ?? "";
  const sizeBytes = (watch(
    `${namePrefix}.document_size` as never
  ) as unknown as number) ?? 0;
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      setError(
        `Bestand is te groot (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxMB} MB.`
      );
      e.target.value = "";
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      setValue(`${namePrefix}.document_filename` as never, file.name as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`${namePrefix}.document_data` as never, base64 as never, {
        shouldDirty: true,
      });
      setValue(`${namePrefix}.document_size` as never, file.size as never, {
        shouldDirty: true,
      });
      setValue(`${namePrefix}.document_mime` as never, file.type as never, {
        shouldDirty: true,
      });
    };
    reader.onerror = () => setError("Kon het bestand niet lezen.");
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setValue(`${namePrefix}.document_filename` as never, "" as never, {
      shouldDirty: true,
    });
    setValue(`${namePrefix}.document_data` as never, "" as never, {
      shouldDirty: true,
    });
    setValue(`${namePrefix}.document_size` as never, 0 as never, {
      shouldDirty: true,
    });
    setValue(`${namePrefix}.document_mime` as never, "" as never, {
      shouldDirty: true,
    });
    setError(null);
  };

  const sizeLabel =
    sizeBytes > 1024 * 1024
      ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(sizeBytes / 1024)} kB`;

  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {filename ? (
        <div className="nbx-file-drop nbx-file-drop-filled">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileIcon />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{filename}</div>
                <div className="text-xs text-nbx-text/55">{sizeLabel}</div>
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <label className="text-xs underline text-nbx-text/70 hover:text-nbx-text cursor-pointer">
                Wijzigen
                <input
                  type="file"
                  accept={accept}
                  onChange={handleChange}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={clear}
                className="text-xs text-nbx-text/40 hover:text-nbx-text underline"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="nbx-file-drop block cursor-pointer text-center">
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="sr-only"
          />
          <div className="flex flex-col items-center gap-2 py-2">
            <UploadIcon />
            <div className="font-medium text-nbx-text/85">
              Klik om je document te kiezen
            </div>
            <div className="text-xs text-nbx-text/55">{accept}</div>
            <div className="text-xs text-nbx-text/55">Max {maxMB} MB</div>
          </div>
        </label>
      )}
      {hint && <p className="text-xs text-nbx-text/55 mt-1.5">{hint}</p>}
      {error && <p className="nbx-error">{error}</p>}
    </div>
  );
}

function FileIcon() {
  return (
    <svg
      width="22"
      height="26"
      viewBox="0 0 22 26"
      fill="none"
      className="flex-shrink-0 text-nbx-text"
      aria-hidden
    >
      <path
        d="M3 2C3 0.895 3.895 0 5 0H13L21 7V24C21 25.105 20.105 26 19 26H5C3.895 26 3 25.105 3 24V2Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M13 0V7H21" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7 13H17M7 17H17M7 21H13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="text-nbx-text/55"
      aria-hidden
    >
      <path
        d="M14 18V4M14 4L8 10M14 4L20 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 22V24C4 25.105 4.895 26 6 26H22C23.105 26 24 25.105 24 24V22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getNestedError(errors: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = errors;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  if (cur && typeof cur === "object" && "message" in (cur as Record<string, unknown>)) {
    const m = (cur as Record<string, unknown>).message;
    return typeof m === "string" ? m : undefined;
  }
  return undefined;
}

// E-mailpaden die elders ingevuld kunnen zijn (voor snelle-invul-suggesties).
// Contactpersonen-e-mails komen er dynamisch bij in FieldEmail.
const EMAIL_SUGGESTION_PATHS = [
  "bedrijfsemail",
  "factuur_email",
  "google_ads.owner_email",
  "search_console.owner_email",
  "ga4.owner_email",
  "linkedin.owner_email",
  "website_cms.owner_email",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mailveld met snelle-invul-chips van eerder ingevulde e-mailadressen. */
function FieldEmail({
  name,
  label,
  placeholder,
  hint,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormData>();
  const err = getNestedError(errors as Record<string, unknown>, name);
  const current = ((watch(name as never) as unknown as string) ?? "").trim();

  const contactEmails = (
    (watch("contactpersonen" as never) as unknown as Array<{ email?: string }>) ?? []
  ).map((c, i) => ({ path: `contactpersonen.${i}.email`, value: (c?.email ?? "").trim() }));

  const suggestions: string[] = [];
  const seen = new Set<string>();
  const candidates = [
    ...EMAIL_SUGGESTION_PATHS.map((p) => ({
      path: p,
      value: ((watch(p as never) as unknown as string) ?? "").trim(),
    })),
    ...contactEmails,
  ];
  for (const { path, value } of candidates) {
    if (path === name) continue;
    if (value && EMAIL_RE.test(value) && value !== current && !seen.has(value)) {
      seen.add(value);
      suggestions.push(value);
    }
  }

  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type="email"
        placeholder={placeholder}
        autoComplete="email"
        className="nbx-input"
        {...register(name as never)}
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] text-nbx-text/45">Snel invullen:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                setValue(name as never, s as never, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-nbx-text/10 bg-nbx-green/20 text-nbx-text hover:bg-nbx-green/40 transition"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-nbx-text/55 mt-1.5">{hint}</p>}
      {err && <p className="nbx-error">{err}</p>}
    </div>
  );
}

/** Klik-om-te-kopieren e-mailchip (standaard marketing@noboxagency.com). */
function CopyableEmail({ email = MARKETING_EMAIL }: { email?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard niet beschikbaar */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Klik om te kopieren"
      className="inline-flex items-center gap-1 rounded bg-nbx-bg/60 border border-nbx-text/10 px-1.5 py-0.5 font-mono text-[0.95em] align-baseline hover:bg-nbx-green/30 transition"
    >
      {email}
      <span className="text-[10px] text-nbx-text/50">{copied ? "gekopieerd ✓" : "kopieer"}</span>
    </button>
  );
}

type MultiFileItem = {
  document_filename?: string;
  document_data?: string;
  document_size?: number;
  document_mime?: string;
  note?: string;
};

function readAsBase64(file: File): Promise<MultiFileItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        document_filename: file.name,
        document_data: (reader.result as string).split(",")[1] || "",
        document_size: file.size,
        document_mime: file.type,
      });
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/**
 * Eén upload-veld waar meerdere bestanden in kunnen. Het eerste bestand vult het
 * bestaande "primary"-veld (logo / branding / pitch_deck -> eigen DB-kolommen + Drive-sync);
 * extra bestanden gaan naar brand_assets (-> extra_documents) met een herkomst-note.
 */
function FieldFileGroup({
  primaryPrefix,
  extraNote,
  label,
  accept,
  maxMB = 5,
  hint,
}: {
  primaryPrefix: "logo" | "branding" | "pitch_deck";
  extraNote: string;
  label: string;
  accept: string;
  maxMB?: number;
  hint?: string;
}) {
  const { watch, setValue } = useFormContext<FormData>();
  const primaryFilename =
    ((watch(`${primaryPrefix}.document_filename` as never) as unknown as string) ?? "");
  const all = ((watch("brand_assets" as never) as unknown as MultiFileItem[]) ?? []) as MultiFileItem[];
  const extras = all
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => f.note === extraNote);
  const [error, setError] = useState<string | null>(null);

  function setPrimary(item: MultiFileItem | null) {
    setValue(`${primaryPrefix}.document_filename` as never, (item?.document_filename ?? "") as never, { shouldDirty: true });
    setValue(`${primaryPrefix}.document_data` as never, (item?.document_data ?? "") as never, { shouldDirty: true });
    setValue(`${primaryPrefix}.document_size` as never, (item?.document_size ?? 0) as never, { shouldDirty: true });
    setValue(`${primaryPrefix}.document_mime` as never, (item?.document_mime ?? "") as never, { shouldDirty: true });
  }

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (list.length === 0) return;
    setError(null);
    const tooBig = list.find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is te groot (max ${maxMB} MB).`);
      e.target.value = "";
      return;
    }
    Promise.all(list.map(readAsBase64))
      .then((items) => {
        let rest = items;
        if (!primaryFilename && items.length > 0) {
          setPrimary(items[0]);
          rest = items.slice(1);
        }
        if (rest.length > 0) {
          setValue(
            "brand_assets" as never,
            [...all, ...rest.map((r) => ({ ...r, note: extraNote }))] as never,
            { shouldDirty: true }
          );
        }
      })
      .catch(() => setError("Kon een bestand niet lezen."));
    e.target.value = "";
  }

  function removePrimary() {
    const firstExtra = extras[0];
    if (firstExtra) {
      setPrimary(firstExtra.f);
      setValue(
        "brand_assets" as never,
        all.filter((_, i) => i !== firstExtra.idx) as never,
        { shouldDirty: true }
      );
    } else {
      setPrimary(null);
    }
  }

  function removeExtra(idx: number) {
    setValue(
      "brand_assets" as never,
      all.filter((_, i) => i !== idx) as never,
      { shouldDirty: true }
    );
  }

  const rows: Array<{ name: string; onRemove: () => void }> = [];
  if (primaryFilename) rows.push({ name: primaryFilename, onRemove: removePrimary });
  for (const { f, idx } of extras) {
    rows.push({ name: f.document_filename ?? "bestand", onRemove: () => removeExtra(idx) });
  }

  return (
    <div>
      <label className="nbx-field-label">{label}</label>
      {rows.length > 0 && (
        <ul className="space-y-2 mb-2">
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className="nbx-file-drop nbx-file-drop-filled flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon />
                <span className="text-sm truncate">{r.name}</span>
              </div>
              <button
                type="button"
                onClick={r.onRemove}
                className="text-xs text-nbx-text/40 hover:text-nbx-text underline flex-shrink-0"
              >
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="nbx-file-drop block cursor-pointer text-center">
        <input type="file" accept={accept} multiple onChange={handleAdd} className="sr-only" />
        <div className="flex flex-col items-center gap-2 py-2">
          <UploadIcon />
          <div className="font-medium text-nbx-text/85">
            {rows.length > 0 ? "Nog een bestand toevoegen" : "Klik om bestanden te kiezen"}
          </div>
          <div className="text-xs text-nbx-text/55">
            Meerdere bestanden mogelijk · max {maxMB} MB per bestand
          </div>
        </div>
      </label>
      {hint && <p className="text-xs text-nbx-text/55 mt-1.5">{hint}</p>}
      {error && <p className="nbx-error">{error}</p>}
    </div>
  );
}

/** Keuze: vrije tekst typen of een document uploaden; het veld verschijnt pas na de keuze. */
function TextOrDocField({
  label,
  textName,
  docPrefix,
  textPlaceholder,
  accept,
  hint,
}: {
  label: string;
  textName: string;
  docPrefix: string;
  textPlaceholder?: string;
  accept: string;
  hint?: string;
}) {
  const { watch } = useFormContext<FormData>();
  const textVal = ((watch(textName as never) as unknown as string) ?? "");
  const docFilename =
    ((watch(`${docPrefix}.document_filename` as never) as unknown as string) ?? "");
  const [mode, setMode] = useState<"" | "text" | "doc">(
    textVal ? "text" : docFilename ? "doc" : ""
  );

  return (
    <div>
      <label className="nbx-field-label">{label}</label>
      <div className="flex flex-wrap gap-2 mb-1">
        <button
          type="button"
          onClick={() => setMode(mode === "text" ? "" : "text")}
          className={`nbx-check-pill ${mode === "text" ? "nbx-check-pill-active" : ""}`}
        >
          Typen
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "doc" ? "" : "doc")}
          className={`nbx-check-pill ${mode === "doc" ? "nbx-check-pill-active" : ""}`}
        >
          Document uploaden
        </button>
      </div>
      {hint && mode === "" && <p className="text-xs text-nbx-text/55 mt-1">{hint}</p>}
      {mode === "text" && (
        <div className="mt-3">
          <FieldTextarea name={textName} label="Vertel kort" placeholder={textPlaceholder} rows={3} />
        </div>
      )}
      {mode === "doc" && (
        <div className="mt-3">
          <FieldFile namePrefix={docPrefix} label="Kies je document" accept={accept} maxMB={10} />
        </div>
      )}
    </div>
  );
}

// ----- Section components -----

function Section1Bedrijf() {
  return (
    <div className="space-y-5">
      <FieldText
        name="bedrijfsnaam"
        label="Bedrijfsnaam"
        placeholder="Acme Recruitment BV"
        required
        autoComplete="organization"
      />
      <FieldEmail
        name="bedrijfsemail"
        label="E-mailadres bedrijf"
        required
        placeholder="info@acme.nl"
        hint="Algemeen contactadres: hier sturen we de welkomstmail naartoe."
      />
      <FieldText
        name="website"
        label="Website"
        placeholder="acme.nl"
        autoComplete="url"
      />
      <div className="pt-4 border-t border-nbx-text/10">
        <ContactpersonenField />
      </div>
      <div className="pt-4 border-t border-nbx-text/10">
        <p className="nbx-field-label mb-3">Administratie</p>
        <div className="space-y-5">
          <FieldTextarea
            name="factuuradres"
            label="Factuuradres"
            placeholder="Straatnaam 1, 1234 AB Stad"
            rows={2}
            hint="Vaak anders dan vestigingsadres — bijv. accountant of holding."
          />
          <FieldEmail
            name="factuur_email"
            label="E-mail voor facturen"
            placeholder="boekhouding@bedrijf.nl"
            hint="Naar welk adres mogen we facturen sturen?"
          />
        </div>
      </div>
      <div className="pt-4 border-t border-nbx-text/10">
        <FieldTextarea
          name="concurrenten"
          label="Concurrenten (optioneel)"
          placeholder={"Eén URL per regel, bijv.\nacmegroep.nl\nvergelijkbaarbedrijf.nl"}
          rows={4}
          hint="Plak de websites van je belangrijkste concurrenten, één URL per regel. Sebas heeft dit vaak al; alleen invullen als hij erom vraagt."
        />
      </div>
    </div>
  );
}

/**
 * Repeatable contactpersonen-lijst. Wie hier "ClickUp-toegang" aan heeft staan,
 * wordt door de automation als gast uitgenodigd in de gezamenlijke ClickUp-space.
 */
function ContactpersonenField() {
  const { control, register, formState } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "contactpersonen" });
  const arrayError = (formState.errors as Record<string, { message?: string } | undefined>)
    .contactpersonen?.message;

  return (
    <div>
      <p className="nbx-field-label mb-1">Contactpersonen</p>
      <p className="text-xs text-nbx-text/55 mb-4 max-w-lg">
        Onze vaste aanspreekpunten. Iedereen met het vinkje{" "}
        <strong>ClickUp-toegang</strong> krijgt automatisch een uitnodiging voor de
        gezamenlijke ClickUp-omgeving die we voor jullie opzetten.
      </p>
      <div className="space-y-4">
        {fields.map((field, i) => {
          return (
            <div
              key={field.id}
              className="rounded-2xl border border-nbx-text/10 bg-nbx-bg/40 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-kicker text-nbx-text/55">
                  Persoon {i + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-nbx-text/40 hover:text-nbx-text underline"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <FieldText
                    name={`contactpersonen.${i}.voornaam`}
                    label="Voornaam"
                    placeholder="Sanne"
                    required
                    autoComplete="given-name"
                  />
                  <FieldText
                    name={`contactpersonen.${i}.achternaam`}
                    label="Achternaam"
                    placeholder="de Vries"
                    autoComplete="family-name"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <FieldEmail
                    name={`contactpersonen.${i}.email`}
                    label="E-mail"
                    placeholder="sanne@acme.nl"
                    required
                  />
                  <FieldText
                    name={`contactpersonen.${i}.functie`}
                    label="Functie"
                    placeholder="Marketing manager"
                    required
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...register(`contactpersonen.${i}.clickup_toegang` as never)}
                    className="mt-0.5 w-4 h-4 accent-current"
                  />
                  <span className="text-sm text-nbx-text/75 leading-snug">
                    ClickUp-toegang: nodig deze persoon uit voor onze gezamenlijke
                    projectomgeving
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() =>
          append({
            voornaam: "",
            achternaam: "",
            email: "",
            functie: "",
            clickup_toegang: true,
          })
        }
        className="mt-4 nbx-check-pill"
      >
        + Contactpersoon toevoegen
      </button>
      {arrayError && <p className="nbx-error">{arrayError}</p>}
    </div>
  );
}

function Section2Platforms() {
  const { watch, setValue } = useFormContext<FormData>();
  const hasGAds = watch("google_ads.has");
  const hasGSC = watch("search_console.has");
  const hasGA4 = watch("ga4.has");
  const hasMeta = watch("meta_business.has");
  const hasLI = watch("linkedin.has");
  const hasIG = watch("instagram.has");
  const hasCms = watch("website_cms.has");
  const cmsType = watch("website_cms.cms_type");

  // Bij "nee" op website: cms_type op "Geen" (welkomstmail slaat het blok dan over).
  useEffect(() => {
    if (hasCms === false && cmsType !== "Geen") {
      setValue("website_cms.cms_type", "Geen", { shouldDirty: true });
    } else if (hasCms === true && cmsType === "Geen") {
      setValue("website_cms.cms_type", "", { shouldDirty: true });
    }
  }, [hasCms, cmsType, setValue]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-nbx-bg/60 border border-nbx-text/10 p-4 sm:p-5">
        <p className="text-sm text-nbx-text/75 leading-relaxed">
          Beantwoord per platform <strong>ja of nee</strong>. Bij ja zie je precies wat we
          nodig hebben: alleen e-mailadressen en account-ID&apos;s, nooit wachtwoorden. Voor
          de meeste platforms voeg je <CopyableEmail /> toe als gebruiker.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Ads</h3>
        <FieldYesNo name="google_ads.has" label="Heb je een Google Ads account?" />
        {hasGAds === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Geen wachtwoord nodig: wij sturen een koppelverzoek naar jullie Customer ID,
              de eigenaar accepteert met één klik.
            </p>
            <InfoDropdown title="Waar vind ik mijn Customer ID en hoe accepteer ik?">
              <ol className="list-decimal pl-4 space-y-1">
                <li>
                  Log in op <strong>ads.google.com</strong>. Je Customer ID staat
                  rechtsboven naast je accountnaam: 10 cijfers, bv. 123-456-7890.
                </li>
                <li>Vul dat nummer hieronder in. Wij sturen daar het koppelverzoek heen.</li>
                <li>
                  De eigenaar krijgt een e-mail van Google Ads en een melding in het
                  account, en accepteert via Beheer → Toegang en beveiliging → Beheerders.
                </li>
              </ol>
            </InfoDropdown>
            <div className="grid sm:grid-cols-2 gap-5">
              <FieldText
                name="google_ads.customer_id"
                label="Customer ID (10-cijferig)"
                placeholder="123-456-7890"
                required
                hint="Rechtsboven in Google Ads, naast je accountnaam."
              />
              <FieldEmail
                name="google_ads.owner_email"
                label="E-mail accounteigenaar"
                required
                hint="Daar komt het koppelverzoek binnen."
              />
            </div>
          </div>
        )}
        {hasGAds === false && (
          <div className="pt-1 animate-fade-up">
            <FieldYesNo name="google_ads.wil_opzetten" label="Wil je dat we er een opzetten?" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Search Console</h3>
        <FieldYesNo name="search_console.has" label="Heb je Search Console ingericht?" />
        {hasGSC === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Geen wachtwoord nodig: voeg ons toe als gebruiker.
            </p>
            <InfoDropdown title="Hoe voeg ik marketing@noboxagency.com toe?">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open Google Search Console.</li>
                <li>Ga naar Instellingen → Gebruikers en machtigingen.</li>
                <li>
                  Klik &quot;Gebruiker toevoegen&quot; en vul <CopyableEmail /> in.
                </li>
                <li>Kies rol &quot;Volledig&quot; (Full) en bevestig.</li>
              </ol>
            </InfoDropdown>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Analytics 4</h3>
        <FieldYesNo name="ga4.has" label="Heb je GA4?" />
        {hasGA4 === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Geen wachtwoord nodig: voeg ons toe als gebruiker.
            </p>
            <InfoDropdown title="Hoe voeg ik marketing@noboxagency.com toe?">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open Google Analytics (GA4).</li>
                <li>Ga naar Beheer (tandwiel linksonder) → Toegangsbeheer voor property.</li>
                <li>
                  Klik &quot;+&quot; → &quot;Gebruikers toevoegen&quot; en vul{" "}
                  <CopyableEmail /> in.
                </li>
                <li>Kies rol &quot;Bewerker&quot; (Editor) en bevestig.</li>
              </ol>
              <p className="mt-2 text-nbx-text/55">
                Je Property ID vind je op dezelfde Beheer-pagina onder
                &quot;Property-instellingen&quot; (een nummer, bv. 123456789).
              </p>
            </InfoDropdown>
            {/* Alleen Property ID nodig; de klant voegt ons zelf toe als gebruiker. */}
            <FieldText
              name="ga4.property_id"
              label="Property ID"
              placeholder="123456789"
              required
              hint="GA4 → Beheer → Property-instellingen."
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Meta Business Manager</h3>
        <FieldYesNo name="meta_business.has" label="Werken jullie met Meta Ads (Facebook/Instagram)?" />
        {hasMeta === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Geen wachtwoord nodig: jullie voegen ons toe als partner.
            </p>
            <InfoDropdown title="Hoe voeg ik Nobox toe als partner?">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open Meta Business Suite → Instellingen → Bedrijf (Business Settings).</li>
                <li>Ga naar Partners en klik &quot;Toevoegen&quot; (Add Partner).</li>
                <li>
                  Vul onze Business Manager-ID in:{" "}
                  {NOBOX_BM_ID ? (
                    <CopyableEmail email={NOBOX_BM_ID} />
                  ) : (
                    <>die staat in de welkomstmail die je na dit formulier van ons krijgt.</>
                  )}
                </li>
                <li>Geef toegang tot je advertentieaccount en pagina&apos;s.</li>
              </ol>
            </InfoDropdown>
            <FieldText
              name="meta_business.business_manager_id"
              label="Jullie Business Manager-ID (optioneel)"
              placeholder="1234567890"
              hint="Meta Business Suite → Instellingen → Bedrijfsinfo. Handig als wij het partnerverzoek vanuit onze kant willen starten."
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">LinkedIn bedrijfspagina</h3>
        <FieldYesNo name="linkedin.has" label="Hebben jullie een LinkedIn bedrijfspagina?" />
        {hasLI === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Geen wachtwoord nodig: je voegt straks een Nobox-beheerder toe aan je pagina.
              LinkedIn werkt met <strong>personen</strong> (profielen), niet met
              e-mailadressen.
            </p>
            <InfoDropdown title="Hoe werkt dit precies?">
              <ol className="list-decimal pl-4 space-y-1">
                <li>
                  Vul hieronder de naam of URL van jullie bedrijfspagina in.{" "}
                  <strong>Na het versturen</strong> volgt een Nobox-collega (meestal
                  Sebas) jullie pagina, want alleen volgers kun je als beheerder
                  toevoegen.
                </li>
                <li>
                  Je krijgt van ons bericht zodra we volgen, met de naam van de persoon
                  die je toevoegt.
                </li>
                <li>
                  Open je bedrijfspagina als super admin → Instellingen → Beheerders
                  beheren (Manage admins) → &quot;Beheerder toevoegen&quot;, zoek die
                  persoon op en geef de rol Super admin.
                </li>
              </ol>
            </InfoDropdown>
            {/* Geen e-mail nodig: LinkedIn kent geen invite-per-mail. Wij volgen
                eerst de pagina, daarna voegt de klant ons als persoon toe. We
                hebben enkel de naam/URL van de bedrijfspagina nodig. */}
            <FieldText
              name="linkedin.company_page"
              label="Naam of URL van jullie bedrijfspagina"
              placeholder="linkedin.com/company/acme"
              required
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Instagram bedrijfsaccount</h3>
        <FieldYesNo name="instagram.has" label="Hebben jullie een Instagram zakelijk account?" />
        {hasIG === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              <strong>Wachtwoord nodig:</strong> Instagram heeft geen uitnodig-flow voor
              bureaus. De login deel je straks veilig via onetimesecret (volgende stap).
              Hier alleen je handle of e-mail ter referentie.
            </p>
            <FieldText
              name="instagram.owner_email_or_handle"
              label="E-mailadres of @gebruikersnaam"
              placeholder="@acmerecruitment"
              required
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Website</h3>
        <FieldYesNo
          name="website_cms.has"
          label="Gaan wij (mee)werken aan jullie website?"
        />
        {hasCms === true && (
          <div className="space-y-3 pt-1 animate-fade-up">
            <p className="text-xs text-nbx-text/55">
              Meestal geen wachtwoord nodig: voeg ons toe als gebruiker in je CMS.
            </p>
            <InfoDropdown title="Hoe voeg ik ons toe in mijn CMS?">
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>WordPress:</strong> Beheer → Gebruikers → Nieuwe toevoegen, rol
                  Beheerder, e-mail <CopyableEmail />.
                </li>
                <li>
                  <strong>Webflow / Squarespace:</strong> nodig ons uit als collaborator
                  via de site-instellingen.
                </li>
                <li>
                  <strong>Shopify:</strong> Instellingen → Gebruikers en machtigingen →
                  Personeel toevoegen.
                </li>
              </ul>
              <p className="mt-2 text-nbx-text/55">
                Geen invite-optie in jouw CMS? Dan deel je de login via onetimesecret (zie
                de volgende stap).
              </p>
            </InfoDropdown>
            <FieldSelect
              name="website_cms.cms_type"
              label="Welk CMS?"
              required
              options={[
                { value: "WordPress", label: "WordPress" },
                { value: "Squarespace", label: "Squarespace" },
                { value: "Webflow", label: "Webflow" },
                { value: "Shopify", label: "Shopify" },
                { value: "Anders", label: "Anders" },
              ]}
            />
            {/* Geen e-mailveld hier: de klant voegt ons (marketing@noboxagency.com)
                zelf toe in hun CMS, dus een eigen e-mailadres heeft geen functie. */}
            <FieldText
              name="website_cms.cms_other"
              label="Andere, welke?"
              placeholder="(alleen invullen bij 'Anders')"
            />
          </div>
        )}
      </div>

      <FieldTextarea
        name="overige_platforms"
        label="Overige platformen? (optioneel)"
        placeholder="bv. TikTok Ads, Pinterest, etc."
      />

      <div className="pt-2">
        <FieldTextarea
          name="internal_tools"
          label="Interne tools (optioneel)"
          placeholder={
            "bv. ATS (Recruitee, Carerix, Bullhorn), CRM (HubSpot, Pipedrive), Leadinfo, e-mailmarketing (Mailchimp, ActiveCampaign), projectmanagement…"
          }
          rows={3}
          hint="Welke systemen gebruiken jullie intern? Denk ook aan tools waar je niet direct aan denkt, zoals je ATS of Leadinfo. Dan weten wij waar we straks mogelijk toegang voor nodig hebben."
        />
      </div>
    </div>
  );
}

function Section3Vault() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-nbx-bg/60 border border-nbx-text/10 p-5 sm:p-6 flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-nbx-green flex items-center justify-center">
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden>
            <path
              d="M3 8V6C3 2.686 5.686 0 9 0C12.314 0 15 2.686 15 6V8M3 8H15M3 8C1.895 8 1 8.895 1 10V18C1 19.105 1.895 20 3 20H15C16.105 20 17 19.105 17 18V10C17 8.895 16.105 8 15 8M9 13V15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-base sm:text-lg mb-2">Hier hoef je niks in te vullen.</h3>
          <p className="text-sm text-nbx-text/75 leading-relaxed mb-3">
            De meeste toegang regel je zonder wachtwoord: je voegt <CopyableEmail /> toe als
            gebruiker bij je platforms (dat deed je in de vorige stap).
          </p>
          <p className="text-sm text-nbx-text/75 leading-relaxed mb-3">
            Heeft een account toch een wachtwoord nodig (zoals Instagram, of een CMS zonder
            invite-optie)? Deel die login dan veilig via onetimesecret:
          </p>
          <ol className="text-sm text-nbx-text/75 leading-relaxed list-decimal pl-5 space-y-1.5 mb-4">
            <li>
              Open{" "}
              <a
                href={ONETIMESECRET_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-nbx-text"
              >
                eu.onetimesecret.com
              </a>{" "}
              (geen account of login nodig).
            </li>
            <li>Plak je inloggegevens in het vak en klik op &quot;Create Link&quot;.</li>
            <li>
              Kopieer de link die je krijgt en <strong>stuur die naar ons</strong>. Open
              &apos;m zelf niet, hij werkt maar een keer.
            </li>
          </ol>
          <ArrowSlideLink href={ONETIMESECRET_URL} external variant="green">
            Open eu.onetimesecret.com
          </ArrowSlideLink>
          <p className="text-xs text-nbx-text/55 mt-3">
            <b>Tip:</b> bewaar de inloggegevens zelf ook even ergens (bijv. je
            wachtwoordmanager), voor het geval er iets misgaat.
          </p>
          <p className="text-xs text-nbx-text/55 mt-3">
            <b>Stuur nooit wachtwoorden via dit formulier of per gewone mail.</b>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section4Branding() {
  return (
    <div className="space-y-10">
      <div className="space-y-7">
        <p className="nbx-field-label">Bestanden</p>
        <FieldFileGroup
          primaryPrefix="logo"
          extraNote="Logo"
          label="Logo's (vector heeft de voorkeur)"
          accept=".svg,.eps,.ai,.pdf,.png,.jpg,.jpeg,.webp,.gif,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,application/postscript,application/pdf"
          maxMB={10}
          hint="Liefst SVG of EPS (vector). PNG, JPG of WEBP mag ook. Upload gerust meerdere varianten."
        />
        <FieldFileGroup
          primaryPrefix="branding"
          extraNote="Brand guide"
          label="Brand guide / huisstijl (optioneel)"
          accept=".pdf,.doc,.docx,.txt,.md,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip"
          maxMB={10}
          hint="Brand guide, huisstijl-document, fonts: alles is welkom."
        />
        <FieldFileGroup
          primaryPrefix="pitch_deck"
          extraNote="Pitch deck"
          label="Pitch deck / sales-presentatie (optioneel)"
          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          maxMB={10}
          hint="Helpt ons jullie verhaal beter te begrijpen."
        />
      </div>

      <div className="pt-6 border-t border-nbx-text/10">
        <p className="nbx-field-label mb-3">Merkkleuren (optioneel)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldText name="brand_color_hex" label="Primair" placeholder="#E6FB7C" />
          <FieldText name="brand_secondary_hex" label="Secundair" placeholder="#000000" />
          <FieldText name="brand_accent_hex" label="Accent" placeholder="#D2BBFF" />
        </div>
        <p className="text-xs text-nbx-text/55 mt-2">
          Vooral handig als je geen brand guide uploadt. Heb je die wel, dan mag je dit
          overslaan.
        </p>
      </div>

      <div className="pt-6 border-t border-nbx-text/10">
        <p className="nbx-field-label mb-3">Foto &amp; video</p>
        <FieldText
          name="foto_video_drive_link"
          label="Drive-link foto/video (optioneel)"
          placeholder="drive.google.com/…"
          hint="Belangrijk: zet de map op 'iedereen met de link kan bekijken', of voeg marketing@noboxagency.com toe. Anders kunnen we er niet bij."
        />
      </div>

      <div className="pt-6 border-t border-nbx-text/10 space-y-7">
        <p className="nbx-field-label">Content</p>
        <TextOrDocField
          label="Klantcases / referenties (optioneel)"
          textName="klantcases_text"
          docPrefix="klantcases_document"
          textPlaceholder="Welke klanten of cases mogen we noemen? Namen of quotes plakken kan ook."
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hint="Typ het kort, of upload een document. Mag ook leeg blijven."
        />
        <TextOrDocField
          label="Bestaande contentstrategie (optioneel)"
          textName="contentstrategie_text"
          docPrefix="contentstrategie_document"
          textPlaceholder="Heb je al een contentstrategie? Beschrijf kort of plak de hoofdlijnen."
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hint="Typ het kort, of upload een document. Mag ook leeg blijven."
        />
      </div>

      <div className="pt-6 border-t border-nbx-text/10">
        <FieldTextarea
          name="branding.notes"
          label="Iets specifieks dat we moeten weten?"
          placeholder="Bv. wat juist NIET mag, do's en don'ts (optioneel)"
          rows={3}
        />
      </div>
    </div>
  );
}

function Section5Review() {
  const { watch } = useFormContext<FormData>();
  const v = watch();

  const fname = (f?: { document_filename?: string }) =>
    f?.document_filename ? f.document_filename : "";

  // Hoofdbestand + aantal extra's uit dezelfde upload-groep (brand_assets note).
  const fileGroup = (primary: string, note: string) => {
    const extra = (v.brand_assets ?? []).filter((a) => a.note === note).length;
    if (!primary) return "";
    return extra > 0 ? `${primary} +${extra} meer` : primary;
  };

  const colors = [v.brand_color_hex, v.brand_secondary_hex, v.brand_accent_hex]
    .filter((c) => c && c !== "")
    .join(", ");

  const groups: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: "Jullie bedrijf",
      rows: [
        ["Bedrijfsnaam", v.bedrijfsnaam || ""],
        ["E-mail bedrijf", v.bedrijfsemail || ""],
        ["Website", v.website || ""],
        [
          "Contactpersonen",
          (v.contactpersonen ?? [])
            .map((c) =>
              [
                [c.voornaam, c.achternaam].filter(Boolean).join(" "),
                c.functie,
                c.email,
                c.clickup_toegang ? "ClickUp ✓" : "",
              ]
                .filter(Boolean)
                .join(" · ")
            )
            .filter(Boolean)
            .join("\n"),
        ],
        ["Factuuradres", v.factuuradres || ""],
        ["E-mail facturen", v.factuur_email || ""],
        ["Concurrenten", v.concurrenten || ""],
      ],
    },
    {
      title: "Platform-toegangen",
      rows: [
        [
          "Google Ads",
          v.google_ads?.has
            ? [v.google_ads.customer_id, v.google_ads.owner_email].filter(Boolean).join(" · ") || "ja"
            : v.google_ads?.wil_opzetten
              ? "graag opzetten"
              : "",
        ],
        ["Search Console", v.search_console?.has ? v.search_console.owner_email || "ja" : ""],
        [
          "Google Analytics 4",
          v.ga4?.has ? [v.ga4.property_id, v.ga4.owner_email].filter(Boolean).join(" · ") || "ja" : "",
        ],
        ["Meta Business", v.meta_business?.has ? v.meta_business.business_manager_id || "ja" : ""],
        [
          "LinkedIn",
          v.linkedin?.has
            ? [v.linkedin.company_page, v.linkedin.owner_email].filter(Boolean).join(" · ") || "ja"
            : "",
        ],
        ["Instagram", v.instagram?.has ? v.instagram.owner_email_or_handle || "ja" : ""],
        [
          "Website",
          v.website_cms?.has
            ? v.website_cms.cms_type && v.website_cms.cms_type !== "Geen"
              ? v.website_cms.cms_type
              : "ja"
            : "",
        ],
        ["Overige platformen", v.overige_platforms || ""],
        ["Interne tools", v.internal_tools || ""],
      ],
    },
    {
      title: "Branding & content",
      rows: [
        ["Logo's", fileGroup(fname(v.logo), "Logo")],
        ["Brand guide", fileGroup(fname(v.branding), "Brand guide")],
        ["Pitch deck", fileGroup(fname(v.pitch_deck), "Pitch deck")],
        ["Merkkleuren", colors],
        ["Foto/video-link", v.foto_video_drive_link || ""],
        ["Klantcases", v.klantcases_text || fname(v.klantcases_document)],
        ["Contentstrategie", v.contentstrategie_text || fname(v.contentstrategie_document)],
        ["Opmerkingen", v.branding?.notes || ""],
      ],
    },
  ];

  const filled = groups
    .map((g) => ({ title: g.title, rows: g.rows.filter(([, val]) => val && val.trim() !== "") }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-nbx-bg/60 border border-nbx-text/10 p-4 sm:p-5">
        <p className="text-sm text-nbx-text/75 leading-relaxed">
          Even checken of alles klopt. Wil je iets aanpassen, ga dan met <strong>Vorige</strong>{" "}
          terug. Lege velden laten we hier weg. Klopt het? Druk dan op{" "}
          <strong>Verstuur intake</strong>.
        </p>
      </div>
      {filled.map((g) => (
        <div key={g.title} className="space-y-2">
          <h3 className="text-lg">{g.title}</h3>
          <dl className="divide-y divide-nbx-text/10 border-t border-nbx-text/10">
            {g.rows.map(([label, val]) => (
              <div
                key={label}
                className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 py-2.5"
              >
                <dt className="text-[11px] uppercase tracking-kicker text-nbx-text/55">
                  {label}
                </dt>
                <dd className="sm:col-span-2 text-sm text-nbx-text whitespace-pre-wrap break-words">
                  {val}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

