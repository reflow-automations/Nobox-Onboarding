"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFormContext, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  schema,
  defaultValues,
  sectionFieldsByStep,
  sectionTitles,
  dienstenOptions,
  VAULT_URL,
  type FormData,
} from "@/lib/schema";
import { KickerDot, ArrowSlideButton, ArrowLeft } from "./ui";

const STORAGE_KEY = "nbx-onboarding-draft-v2";
const STEPS = sectionTitles.length;

const sectionSubtitles = [
  "Even kennismaken — wie zijn jullie?",
  "Wie is ons vaste aanspreekpunt?",
  "Waar gaan we samen voor?",
  "Welke marketing-platforms en tools gebruiken jullie al?",
  "Hoe we straks veilig jullie wachtwoorden ontvangen.",
  "Branding, tone-of-voice, content — alles optioneel.",
  "Een paar laatste loose ends.",
] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const next = async () => {
    const fields = sectionFieldsByStep[step] as Parameters<typeof methods.trigger>[0];
    const valid = await methods.trigger(fields);
    if (valid && step < STEPS - 1) {
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const onSubmit = methods.handleSubmit(async (data) => {
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
      <form onSubmit={onSubmit} noValidate>
        {/* Progress kicker + segmented bar */}
        <div className="mb-6 sm:mb-8">
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
              {step === 1 && <Section2Contact />}
              {step === 2 && <Section3DoelenDiensten />}
              {step === 3 && <Section4Platforms />}
              {step === 4 && <Section5Vault />}
              {step === 5 && <Section6Branding />}
              {step === 6 && <Section7Praktisch />}
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
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
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
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
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

function FieldCheckboxPills({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<string>;
  required?: boolean;
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();
  const current = ((watch(name as never) as unknown as string[]) ?? []) as string[];
  const err = getNestedError(errors as Record<string, unknown>, name);
  const toggle = (v: string) => {
    const nextVal = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    setValue(name as never, nextVal as never, { shouldValidate: true, shouldDirty: true });
  };
  return (
    <div>
      <label className="nbx-field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className={`nbx-check-pill ${current.includes(v) ? "nbx-check-pill-active" : ""}`}
          >
            {v}
          </button>
        ))}
      </div>
      {err && <p className="nbx-error">{err}</p>}
    </div>
  );
}

function FieldFile({
  namePrefix,
  label,
  accept,
  maxMB = 3,
  required = false,
}: {
  namePrefix: string;
  label: string;
  accept: string;
  maxMB?: number;
  required?: boolean;
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
            <div className="text-xs text-nbx-text/55">
              PDF, Word, Text — max {maxMB} MB
            </div>
          </div>
        </label>
      )}
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
      <FieldText
        name="website"
        label="Website"
        placeholder="acme.nl"
        autoComplete="url"
      />
    </div>
  );
}

function Section2Contact() {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldText
          name="contactpersoon.voornaam"
          label="Voornaam"
          required
          autoComplete="given-name"
        />
        <FieldText
          name="contactpersoon.achternaam"
          label="Achternaam"
          required
          autoComplete="family-name"
        />
      </div>
      <FieldText
        name="contactpersoon.functie"
        label="Functie"
        placeholder="bv. Marketing Manager"
        required
      />
      <FieldText
        name="contactpersoon.email"
        label="E-mailadres"
        type="email"
        required
        autoComplete="email"
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldText
          name="contactpersoon.telefoon"
          label="Telefoonnummer"
          type="tel"
          autoComplete="tel"
        />
        <FieldText
          name="contactpersoon.linkedin"
          label="LinkedIn-profiel"
          placeholder="linkedin.com/in/…"
        />
      </div>
    </div>
  );
}

function Section3DoelenDiensten() {
  return (
    <div className="space-y-6">
      <FieldCheckboxPills
        name="diensten"
        label="Welke diensten neem je af bij Nobox?"
        options={dienstenOptions}
        required
      />
      <FieldTextarea
        name="doelen.hoofddoel"
        label="Belangrijkste doel komende 6 maanden?"
        placeholder="bv. meer leads via Google"
        required
      />
      <FieldTextarea
        name="doelen.kpis"
        label="Specifieke KPI's of doelen?"
        placeholder="bv. 10 leads/mnd, CPL <€50"
      />
      <FieldTextarea
        name="doelen.concurrenten"
        label="Top 3 concurrenten?"
        placeholder="één per regel"
      />
    </div>
  );
}

function Section4Platforms() {
  const { watch } = useFormContext<FormData>();
  const hasGAds = watch("google_ads.has");
  const hasGSC = watch("search_console.has");
  const hasGA4 = watch("ga4.has");
  const hasMeta = watch("meta_business.has");
  const hasLI = watch("linkedin.has");
  const hasIG = watch("instagram.has");
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg">Google Ads</h3>
        <FieldYesNo name="google_ads.has" label="Heb je een Google Ads account?" />
        {hasGAds === true && (
          <div className="grid sm:grid-cols-2 gap-5 pt-1">
            <FieldText name="google_ads.customer_id" label="Customer ID (10-cijferig)" />
            <FieldText name="google_ads.owner_email" label="E-mail van eigenaar" type="email" />
          </div>
        )}
        {hasGAds === false && (
          <div className="pt-1">
            <FieldYesNo name="google_ads.wil_opzetten" label="Wil je dat we er een opzetten?" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Search Console</h3>
        <FieldYesNo name="search_console.has" label="Heb je Search Console ingericht?" />
        {hasGSC === true && (
          <FieldText name="search_console.owner_email" label="E-mail van eigenaar" type="email" />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Analytics 4</h3>
        <FieldYesNo name="ga4.has" label="Heb je GA4?" />
        {hasGA4 === true && (
          <div className="grid sm:grid-cols-2 gap-5">
            <FieldText name="ga4.property_id" label="Property ID" />
            <FieldText name="ga4.owner_email" label="E-mail van eigenaar" type="email" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Meta Business Manager</h3>
        <FieldYesNo name="meta_business.has" label="Werken jullie met Meta Ads?" />
        {hasMeta === true && (
          <FieldText name="meta_business.business_manager_id" label="Business Manager ID" />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">LinkedIn bedrijfspagina</h3>
        <FieldYesNo name="linkedin.has" label="Hebben jullie een LinkedIn bedrijfspagina?" />
        {hasLI === true && (
          <FieldText
            name="linkedin.owner_email"
            label="E-mail van de paginabeheerder"
            type="email"
          />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Instagram bedrijfsaccount</h3>
        <FieldYesNo name="instagram.has" label="Hebben jullie een Instagram zakelijk account?" />
        {hasIG === true && (
          <FieldText
            name="instagram.owner_email_or_handle"
            label="E-mail of @gebruikersnaam"
          />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Website CMS</h3>
        <FieldSelect
          name="website_cms.cms_type"
          label="Welk CMS gebruiken jullie?"
          options={[
            { value: "WordPress", label: "WordPress" },
            { value: "Squarespace", label: "Squarespace" },
            { value: "Webflow", label: "Webflow" },
            { value: "Shopify", label: "Shopify" },
            { value: "Anders", label: "Anders" },
            { value: "Geen", label: "Geen / nog geen website" },
          ]}
        />
        <div className="grid sm:grid-cols-2 gap-5">
          <FieldText
            name="website_cms.cms_other"
            label="Andere — welke?"
            placeholder="(alleen invullen bij 'Anders')"
          />
          <FieldText
            name="website_cms.owner_email"
            label="E-mail voor toegang"
            type="email"
          />
        </div>
      </div>

      <FieldTextarea
        name="overige_platforms"
        label="Overige platformen waar we toegang nodig hebben?"
        placeholder="bv. TikTok Ads, Pinterest, etc."
      />

      <FieldTextarea
        name="internal_tools"
        label="Welke tools gebruiken jullie intern? (geen toegang nodig)"
        placeholder="bv. HubSpot (CRM), Mailchimp, Slack, Notion — laat ons weten welk ecosystem jullie gebruiken"
      />
    </div>
  );
}

function Section5Vault() {
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
            Voor wachtwoorden en logins gebruiken we een beveiligde vault — dit
            formulier is niet de plek om die te delen.
          </p>
          <p className="text-sm">
            <a
              href={VAULT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 bg-nbx-text text-nbx-green rounded-full hover:opacity-90 transition-opacity font-medium"
            >
              Open de vault →
            </a>
          </p>
          <p className="text-xs text-nbx-text/55 mt-3">
            Geen toegang?{" "}
            <a
              href="mailto:onboarding@noboxagency.com"
              className="underline hover:text-nbx-text"
            >
              Mail onboarding@noboxagency.com
            </a>{" "}
            — we sturen 'm binnen 1 werkdag.
          </p>
          <p className="text-xs text-nbx-text/55 mt-3">
            <b>Stuur nooit wachtwoorden via dit form of per mail.</b>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section6Branding() {
  return (
    <div className="space-y-6">
      <FieldFile
        namePrefix="branding"
        label="Brand-document / huisstijl (optioneel)"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        maxMB={3}
      />
      <FieldFile
        namePrefix="pitch_deck"
        label="Pitch deck / sales-presentatie (optioneel)"
        accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        maxMB={5}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldText
          name="brand_color_hex"
          label="Primaire merkkleur (optioneel)"
          placeholder="#E6FB7C"
        />
        <FieldSelect
          name="tone_of_voice"
          label="Tone of voice (optioneel)"
          options={[
            { value: "formeel", label: "Formeel" },
            { value: "informeel", label: "Informeel" },
            { value: "mix", label: "Mix" },
          ]}
        />
      </div>
      <FieldText
        name="foto_video_drive_link"
        label="Drive-link foto/video-materiaal (optioneel)"
        placeholder="drive.google.com/…"
      />
      <FieldTextarea
        name="klantcases_text"
        label="Klantcases / referenties (optioneel)"
        placeholder="Welke klanten / cases mogen we noemen? Bekende namen of quotes plakken kan ook."
        rows={3}
      />
      <FieldTextarea
        name="contentstrategie_text"
        label="Bestaande contentstrategie (optioneel)"
        placeholder="Hebben jullie al een contentstrategie? Plak hier of geef link naar document."
        rows={3}
      />
      <FieldTextarea
        name="branding.notes"
        label="Iets specifieks dat we moeten weten?"
        placeholder="Bv. wat juist NIET mag, do's & don'ts — optioneel"
        rows={3}
      />
    </div>
  );
}

function Section7Praktisch() {
  return (
    <div className="space-y-5">
      <FieldSelect
        name="voorkeur_vergader_tijd"
        label="Voorkeurs-vergader-tijdstip"
        options={[
          { value: "ochtend", label: "Ochtend" },
          { value: "middag", label: "Middag" },
          { value: "avond", label: "Avond" },
          { value: "flexibel", label: "Flexibel" },
        ]}
      />
      <FieldTextarea
        name="bijzonderheden"
        label="Bijzonderheden of zorgen?"
        placeholder="optioneel"
      />
    </div>
  );
}
