import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Geeft de browser een signed upload-URL, zodat bestanden direct naar Supabase
// Storage gaan en niet via /api/submit. Vercel weigert request-bodies boven
// 4,5 MB met HTTP 413 (klantmelding 2026-09-30).
const BUCKET = "onboarding-docs";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let body: { filename?: unknown; size?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const size = Number(body.size);
  if (!filename) {
    return NextResponse.json({ error: "Bestandsnaam ontbreekt" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Bestand is te groot (max 10 MB)" }, { status: 413 });
  }

  const safeFilename = filename.replace(/[^\w.\-]/g, "_").slice(-120);
  const path = `pending/${crypto.randomUUID()}/${safeFilename}`;

  let supabase: ReturnType<typeof createServerSupabase>;
  try {
    supabase = createServerSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: "Database config incomplete", detail: String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed:", error);
    return NextResponse.json(
      { error: "Upload voorbereiden mislukt", detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: data.path, signedUrl: data.signedUrl });
}
