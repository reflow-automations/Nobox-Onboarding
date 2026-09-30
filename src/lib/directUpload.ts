/**
 * Client-side: zet alle gekozen bestanden direct in Supabase Storage (via een
 * signed upload-URL van /api/upload-url) en vervangt de base64-data door het
 * storage-pad. Zo blijft de body van /api/submit klein; Vercel weigert alles
 * boven 4,5 MB met HTTP 413.
 *
 * Mislukt een losse upload, dan gaat de intake toch door. De fout komt dan in
 * document_upload_error en de server logt die in onboarding_intake_logs
 * (zelfde gedrag als toen de server zelf uploadde).
 */

type FileLike = {
  document_filename?: string;
  document_data?: string;
  document_size?: number;
  document_mime?: string;
  document_path?: string;
  document_upload_error?: string;
};

const SINGLE_FILE_FIELDS = [
  "logo",
  "branding",
  "pitch_deck",
  "klantcases_document",
  "contentstrategie_document",
] as const;

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function putToStorage(filename: string, blob: Blob, mime: string): Promise<string> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, size: blob.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.signedUrl || !json?.path) {
    throw new Error(json?.error ?? `upload-url HTTP ${res.status}`);
  }
  const put = await fetch(json.signedUrl, {
    method: "PUT",
    headers: { "content-type": mime, "x-upsert": "false" },
    body: blob,
  });
  if (!put.ok) {
    const text = await put.text().catch(() => "");
    throw new Error(`storage HTTP ${put.status} ${text.slice(0, 200)}`);
  }
  return json.path as string;
}

async function uploadOne<T extends FileLike>(file: T): Promise<T> {
  if (!file?.document_data || !file.document_filename) return file;
  const mime = file.document_mime || "application/octet-stream";
  let lastError: unknown;
  // Twee pogingen: bij grote bestanden zagen we af en toe een losse netwerkfout.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const blob = base64ToBlob(file.document_data, mime);
      const path = await putToStorage(file.document_filename, blob, mime);
      return { ...file, document_data: "", document_path: path, document_size: blob.size };
    } catch (e) {
      lastError = e;
    }
  }
  console.error(`Upload van ${file.document_filename} mislukt:`, lastError);
  return {
    ...file,
    document_data: "",
    document_path: undefined,
    document_upload_error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

export async function uploadFilesDirect<T extends object>(data: T): Promise<T> {
  const out = { ...data } as Record<string, unknown>;
  for (const key of SINGLE_FILE_FIELDS) {
    if (out[key]) out[key] = await uploadOne(out[key] as FileLike);
  }
  if (Array.isArray(out.brand_assets)) {
    const list: FileLike[] = [];
    for (const item of out.brand_assets as FileLike[]) list.push(await uploadOne(item));
    out.brand_assets = list;
  }
  return out as T;
}
