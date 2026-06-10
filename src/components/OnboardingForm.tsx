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
  ONETIMESECRET_URL,
  MARKETING_EMAIL,
  type FormData,
} from "@/lib/schema";
import {
  KickerDot,
  ArrowSlideButton,
  ArrowSlideLink,
  ArrowLeft,
  InfoDropdown,
} from "./ui";

const STORAGE_KEY = "nbx-onboarding-draft-v3";
const STEPS = sectionTitles.length;

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

  const suggestions: string[] = [];
  const seen = new Set<string>();
  for (const p of EMAIL_SUGGESTION_PATHS) {
    if (p === name) continue;
    const v = ((watch(p as never) as unknown as string) ?? "").trim();
    if (v && EMAIL_RE.test(v) && v !== current && !seen.has(v)) {
      seen.add(v);
      suggestions.push(v);
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
};

/** Meerdere bestanden uploaden (logo's / brand-assets). */
function FieldFileMulti({
  name,
  label,
  accept,
  maxMB = 5,
  hint,
}: {
  name: string;
  label: string;
  accept: string;
  maxMB?: number;
  hint?: string;
}) {
  const { watch, setValue } = useFormContext<FormData>();
  const files = ((watch(name as never) as unknown as MultiFileItem[]) ?? []) as MultiFileItem[];
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setError(null);
    const tooBig = Array.from(list).find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is te groot (max ${maxMB} MB).`);
      e.target.value = "";
      return;
    }
    Promise.all(
      Array.from(list).map(
        (file) =>
          new Promise<MultiFileItem>((resolve, reject) => {
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
          })
      )
    )
      .then((added) => {
        setValue(name as never, [...files, ...added] as never, { shouldDirty: true });
      })
      .catch(() => setError("Kon een bestand niet lezen."));
    e.target.value = "";
  }

  function removeAt(i: number) {
    setValue(
      name as never,
      files.filter((_, idx) => idx !== i) as never,
      { shouldDirty: true }
    );
  }

  return (
    <div>
      <label className="nbx-field-label">{label}</label>
      {files.length > 0 && (
        <ul className="space-y-2 mb-2">
          {files.map((f, i) => (
            <li
              key={`${f.document_filename}-${i}`}
              className="nbx-file-drop nbx-file-drop-filled flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon />
                <span className="text-sm truncate">{f.document_filename}</span>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
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
            {files.length > 0 ? "Nog een bestand toevoegen" : "Klik om bestanden te kiezen"}
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

function Section2Platforms() {
  const { watch } = useFormContext<FormData>();
  const hasGAds = watch("google_ads.has");
  const hasGSC = watch("search_console.has");
  const hasGA4 = watch("ga4.has");
  const hasMeta = watch("meta_business.has");
  const hasLI = watch("linkedin.has");
  const hasIG = watch("instagram.has");

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-nbx-bg/60 border border-nbx-text/10 p-4 sm:p-5">
        <p className="text-sm text-nbx-text/75 leading-relaxed">
          <strong>Vul hier alleen e-mailadressen en account-ID&apos;s in.</strong> Voor de
          meeste platforms geef je ons toegang zonder wachtwoord: je voegt{" "}
          <CopyableEmail /> toe
          als gebruiker. Per platform staat hieronder hoe. Accounts zonder zo&apos;n
          uitnodig-optie (zoals Instagram) deel je veilig via onetimesecret, zie de
          volgende stap. Stuur nooit wachtwoorden via dit formulier of per gewone mail.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Ads</h3>
        <p className="text-xs text-nbx-text/55">
          Geen wachtwoord nodig: wij sturen een koppelverzoek, jij accepteert het.
        </p>
        <InfoDropdown title="Hoe accepteer ik het koppelverzoek?">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Wij sturen een agency-koppelverzoek naar jullie account.</li>
            <li>
              De accounteigenaar opent Google Ads en gaat naar Tools (sleutel-icoon) →
              Toegang en beveiliging, of de melding bovenin.
            </li>
            <li>Accepteer het verzoek van Nobox. Klaar, geen wachtwoord nodig.</li>
          </ol>
          <p className="mt-2 text-nbx-text/55">
            Vul hieronder je Customer ID + e-mail van de eigenaar in, dan weten we waar we
            het verzoek heen sturen.
          </p>
        </InfoDropdown>
        <FieldYesNo name="google_ads.has" label="Heb je een Google Ads account?" />
        {hasGAds === true && (
          <div className="grid sm:grid-cols-2 gap-5 pt-1">
            <FieldText name="google_ads.customer_id" label="Customer ID (10-cijferig)" />
            <FieldEmail name="google_ads.owner_email" label="E-mail eigenaar" />
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
        <p className="text-xs text-nbx-text/55">
          Geen wachtwoord nodig: voeg ons toe als gebruiker. De e-mail hieronder gebruiken
          we ter verificatie.
        </p>
        <InfoDropdown title="Hoe voeg ik marketing@noboxagency.com toe?">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open Google Search Console.</li>
            <li>Ga naar Instellingen → Gebruikers en machtigingen.</li>
            <li>
              Klik &quot;Gebruiker toevoegen&quot; en vul{" "}
              <CopyableEmail /> in.
            </li>
            <li>Kies rol &quot;Volledig&quot; (Full) en bevestig.</li>
          </ol>
        </InfoDropdown>
        <FieldYesNo name="search_console.has" label="Heb je Search Console ingericht?" />
        {hasGSC === true && (
          <FieldEmail name="search_console.owner_email" label="E-mail eigenaar" />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Google Analytics 4</h3>
        <p className="text-xs text-nbx-text/55">
          Geen wachtwoord nodig: voeg ons toe als gebruiker. De e-mail hieronder gebruiken
          we ter verificatie.
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
        </InfoDropdown>
        <FieldYesNo name="ga4.has" label="Heb je GA4?" />
        {hasGA4 === true && (
          <div className="grid sm:grid-cols-2 gap-5">
            <FieldText name="ga4.property_id" label="Property ID" />
            <FieldEmail name="ga4.owner_email" label="E-mail eigenaar" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Meta Business Manager</h3>
        <p className="text-xs text-nbx-text/55">
          Geen wachtwoord nodig: voeg ons toe als partner. Onze BM-ID staat in de
          welkomstmail.
        </p>
        <InfoDropdown title="Hoe voeg ik Nobox toe als partner?">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open Meta Business Suite → Instellingen → Bedrijf (Business Settings).</li>
            <li>Ga naar Partners en klik &quot;Toevoegen&quot; (Add Partner).</li>
            <li>Plak onze Business Manager-ID (die sturen we in de welkomstmail).</li>
            <li>
              Geef de gevraagde toegang voor advertenties en pagina&apos;s. Geen wachtwoord
              nodig.
            </li>
          </ol>
        </InfoDropdown>
        <FieldYesNo name="meta_business.has" label="Werken jullie met Meta Ads (Facebook/Instagram)?" />
        {hasMeta === true && (
          <FieldText
            name="meta_business.business_manager_id"
            label="Jullie Business Manager ID"
            hint="Meta Business Suite → Instellingen → Bedrijfsinfo."
          />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">LinkedIn bedrijfspagina</h3>
        <p className="text-xs text-nbx-text/55">
          Geen wachtwoord nodig: voeg ons toe als beheerder. De e-mail hieronder gebruiken
          we ter verificatie.
        </p>
        <InfoDropdown title="Hoe voeg ik ons toe als beheerder?">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open je LinkedIn-bedrijfspagina als super admin.</li>
            <li>Ga naar Instellingen → Beheerders beheren (Manage admins).</li>
            <li>
              Voeg{" "}
              <CopyableEmail /> toe
              als Super admin.
            </li>
          </ol>
          <p className="mt-2 text-nbx-text/55">
            Lukt toevoegen via e-mail niet? Geef hieronder de e-mail van een beheerder op,
            dan stemmen we het samen af.
          </p>
        </InfoDropdown>
        <FieldYesNo name="linkedin.has" label="Hebben jullie een LinkedIn bedrijfspagina?" />
        {hasLI === true && (
          <FieldEmail
            name="linkedin.owner_email"
            label="E-mail van een beheerder"
          />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Instagram bedrijfsaccount</h3>
        <p className="text-xs text-nbx-text/55">
          <strong>Wachtwoord nodig:</strong> Instagram heeft geen uitnodig-flow voor
          bureaus. De login deel je straks veilig via onetimesecret (zie de volgende stap).
          Hier alleen je handle of e-mail ter referentie.
        </p>
        <FieldYesNo name="instagram.has" label="Hebben jullie een Instagram zakelijk account?" />
        {hasIG === true && (
          <FieldText
            name="instagram.owner_email_or_handle"
            label="E-mailadres of @gebruikersnaam"
          />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg">Website CMS</h3>
        <p className="text-xs text-nbx-text/55">
          Meestal geen wachtwoord nodig: voeg ons toe als gebruiker. De e-mail hieronder is
          waar de invite-link naartoe mag.
        </p>
        <InfoDropdown title="Hoe voeg ik ons toe in mijn CMS?">
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>WordPress:</strong> Beheer → Gebruikers → Nieuwe toevoegen, rol
              Beheerder, e-mail{" "}
              <CopyableEmail />.
            </li>
            <li>
              <strong>Webflow / Squarespace:</strong> nodig ons uit als collaborator via de
              site-instellingen.
            </li>
            <li>
              <strong>Shopify:</strong> Instellingen → Gebruikers en machtigingen →
              Personeel toevoegen.
            </li>
          </ul>
          <p className="mt-2 text-nbx-text/55">
            Geen invite-optie in jouw CMS? Dan deel je de login via onetimesecret (zie de
            volgende stap).
          </p>
        </InfoDropdown>
        <FieldSelect
          name="website_cms.cms_type"
          label="Welk CMS?"
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
            label="Andere, welke?"
            placeholder="(alleen invullen bij 'Anders')"
          />
          <FieldEmail
            name="website_cms.owner_email"
            label="E-mail voor invite"
          />
        </div>
      </div>

      <FieldTextarea
        name="overige_platforms"
        label="Overige platformen? (optioneel)"
        placeholder="bv. TikTok Ads, Pinterest, etc."
      />
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
    <div className="space-y-6">
      <FieldFile
        namePrefix="logo"
        label="Logo (vector heeft de voorkeur)"
        accept=".svg,.eps,.ai,.pdf,.png,.jpg,.jpeg,.webp,.gif,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,application/postscript,application/pdf"
        maxMB={5}
        hint="Liefst SVG of EPS (vector). PNG, JPG, WEBP mag ook."
      />
      <FieldFileMulti
        name="brand_assets"
        label="Extra logo-varianten en brand-bestanden (optioneel)"
        accept=".svg,.eps,.ai,.pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,application/pdf,application/postscript,application/zip"
        maxMB={10}
        hint="Meerdere bestanden mogelijk: extra logo's, kleurvarianten, fonts, huisstijl-bestanden."
      />
      <FieldFile
        namePrefix="branding"
        label="Brand guide / huisstijl-document (optioneel)"
        accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        maxMB={10}
        hint="Brand guide of huisstijl-document, als je 'm hebt."
      />
      <FieldFile
        namePrefix="pitch_deck"
        label="Pitch deck / sales-presentatie (optioneel)"
        accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        maxMB={10}
        hint="Helpt ons jullie verhaal beter te begrijpen."
      />
      <div>
        <p className="nbx-field-label mb-2">Merkkleuren (optioneel)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldText name="brand_color_hex" label="Primair" placeholder="#E6FB7C" />
          <FieldText name="brand_secondary_hex" label="Secundair" placeholder="#000000" />
          <FieldText name="brand_accent_hex" label="Accent" placeholder="#D2BBFF" />
        </div>
        <p className="text-xs text-nbx-text/55 mt-1.5">
          Vooral handig als je geen brand guide uploadt. Heb je die wel, dan mag je dit
          overslaan.
        </p>
      </div>
      <FieldText
        name="foto_video_drive_link"
        label="Drive-link foto/video (optioneel)"
        placeholder="drive.google.com/…"
        hint="Zet de map op 'iedereen met de link kan bekijken/downloaden', of voeg marketing@noboxagency.com toe als beheerder. Anders kunnen we er niet bij."
      />
      <div className="space-y-2">
        <FieldTextarea
          name="klantcases_text"
          label="Klantcases / referenties (optioneel)"
          placeholder="Welke klanten / cases mogen we noemen? Bekende namen of quotes plakken kan ook."
          rows={3}
        />
        <FieldFile
          namePrefix="klantcases_document"
          label="...of upload een document met klantcases"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          maxMB={10}
        />
      </div>
      <div className="space-y-2">
        <FieldTextarea
          name="contentstrategie_text"
          label="Bestaande contentstrategie (optioneel)"
          placeholder="Heb je al een contentstrategie? Plak hier, of upload een document."
          rows={3}
        />
        <FieldFile
          namePrefix="contentstrategie_document"
          label="...of upload je contentstrategie-document"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          maxMB={10}
        />
      </div>
      <FieldTextarea
        name="branding.notes"
        label="Iets specifieks dat we moeten weten?"
        placeholder="Bv. wat juist NIET mag, do's en don'ts (optioneel)"
        rows={3}
      />
    </div>
  );
}

function Section5Review() {
  const { watch } = useFormContext<FormData>();
  const v = watch();

  const fname = (f?: { document_filename?: string }) =>
    f?.document_filename ? f.document_filename : "";

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
        ["LinkedIn", v.linkedin?.has ? v.linkedin.owner_email || "ja" : ""],
        ["Instagram", v.instagram?.has ? v.instagram.owner_email_or_handle || "ja" : ""],
        [
          "Website CMS",
          v.website_cms?.cms_type && v.website_cms.cms_type !== "Geen" ? v.website_cms.cms_type : "",
        ],
        ["Overige platformen", v.overige_platforms || ""],
      ],
    },
    {
      title: "Branding & content",
      rows: [
        ["Logo", fname(v.logo)],
        [
          "Extra brand-assets",
          v.brand_assets && v.brand_assets.length > 0 ? `${v.brand_assets.length} bestand(en)` : "",
        ],
        ["Brand-document", fname(v.branding)],
        ["Pitch deck", fname(v.pitch_deck)],
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

