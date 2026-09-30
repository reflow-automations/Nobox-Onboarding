import { NextResponse } from "next/server";
import { schema } from "@/lib/schema";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 30;

type UploadField = {
  formField: "logo" | "branding" | "pitch_deck";
  pathField: string;
  filenameField: string;
  sizeField: string;
  mimeField: string;
};

const UPLOAD_FIELDS: UploadField[] = [
  {
    formField: "logo",
    pathField: "logo_path",
    filenameField: "logo_filename",
    sizeField: "logo_size",
    mimeField: "logo_mime",
  },
  {
    formField: "branding",
    pathField: "brand_document_path",
    filenameField: "brand_document_filename",
    sizeField: "brand_document_size",
    mimeField: "brand_document_mime",
  },
  {
    formField: "pitch_deck",
    pathField: "pitch_deck_path",
    filenameField: "pitch_deck_filename",
    sizeField: "pitch_deck_size",
    mimeField: "pitch_deck_mime",
  },
];

const BUCKET = "onboarding-docs";
// Alleen paden die /api/upload-url zelf uitdeelt; geen verwijzingen naar andermans bestanden.
const PENDING_PATH = /^pending\/[0-9a-f-]{36}\/[^/]+$/;

type IncomingFile = {
  document_filename?: string;
  document_data?: string;
  document_size?: number;
  document_mime?: string;
  document_path?: string;
  document_upload_error?: string;
};

type PlacedFile = { path: string; filename: string; size: number; mime: string | null };

/**
 * Zet een bestand op `${intakeId}/${prefix}-${naam}`.
 * Nieuw: de browser heeft het al in pending/ gezet (document_path) -> verplaatsen.
 * Oud: base64 in document_data -> zelf uploaden (alleen nog voor kleine drafts).
 * Gooit bij een fout; de aanroeper logt die.
 */
async function placeFile(
  supabase: ReturnType<typeof createServerSupabase>,
  intakeId: string,
  file: IncomingFile,
  prefix: string
): Promise<PlacedFile | null> {
  if (!file.document_filename) return null;
  if (file.document_upload_error) throw new Error(`browser-upload: ${file.document_upload_error}`);
  const safeFilename = file.document_filename.replace(/[^\w.\-]/g, "_");
  const target = `${intakeId}/${prefix}-${safeFilename}`;
  const mime = file.document_mime || null;

  if (file.document_path) {
    if (!PENDING_PATH.test(file.document_path)) {
      throw new Error(`Ongeldig upload-pad: ${file.document_path}`);
    }
    const { error } = await supabase.storage.from(BUCKET).move(file.document_path, target);
    if (error) {
      // Bestand staat er wel, alleen niet in de intake-map. Verwijs naar het pending-pad.
      await supabase.from("onboarding_intake_logs").insert({
        intake_id: intakeId,
        event: `${prefix}_move_failed`,
        payload: { error: error.message, path: file.document_path },
      });
      return { path: file.document_path, filename: safeFilename, size: file.document_size ?? 0, mime };
    }
    return { path: target, filename: safeFilename, size: file.document_size ?? 0, mime };
  }

  if (!file.document_data) return null;
  const buffer = Buffer.from(file.document_data, "base64");
  const { error } = await supabase.storage.from(BUCKET).upload(target, buffer, {
    contentType: mime || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`${error.message} (${target})`);
  return { path: target, filename: safeFilename, size: buffer.byteLength, mime };
}

export async function POST(req: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookToken = process.env.N8N_WEBHOOK_TOKEN;

  if (!webhookUrl || !webhookToken) {
    return NextResponse.json(
      { error: "Server config incomplete (N8N_WEBHOOK_URL / N8N_WEBHOOK_TOKEN)" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;
  let supabase: ReturnType<typeof createServerSupabase>;
  try {
    supabase = createServerSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: "Database config incomplete", detail: String(e) },
      { status: 500 }
    );
  }

  // 1. Insert intake row.
  // Cast door: DB heeft kolommen die generated types nog niet kennen.
  const insertPayload = {
    bedrijfsnaam: data.bedrijfsnaam,
    bedrijfsemail: data.bedrijfsemail,
    website: data.website ?? null,
    // Zelfde shape als het dashboard (ContactsEditor) gebruikt; clickup_toegang
    // bepaalt wie n8n als gast uitnodigt in de ClickUp-space.
    contactpersonen:
      data.contactpersonen && data.contactpersonen.length > 0
        ? data.contactpersonen.map((c) => ({
            voornaam: c.voornaam,
            achternaam: c.achternaam || "",
            email: c.email,
            functie: c.functie,
            clickup_toegang: c.clickup_toegang === true,
          }))
        : null,
    factuuradres: data.factuuradres || null,
    factuur_email: data.factuur_email ?? null,
    concurrenten: data.concurrenten || null,
    google_ads: data.google_ads,
    search_console: data.search_console,
    ga4: data.ga4,
    meta_business: data.meta_business,
    linkedin: data.linkedin,
    instagram: data.instagram,
    website_cms: data.website_cms,
    overige_platforms: data.overige_platforms || null,
    internal_tools: data.internal_tools || null,
    brand_notes: data.branding?.notes || null,
    brand_color_hex: data.brand_color_hex || null,
    foto_video_drive_link: data.foto_video_drive_link ?? null,
    klantcases_text: data.klantcases_text || null,
    contentstrategie_text: data.contentstrategie_text || null,
    raw_payload: data as unknown as Json,
  };
  const { data: intake, error: insertError } = await supabase
    .from("onboarding_intakes")
    .insert(insertPayload as never)
    .select("id, reference_id, created_at")
    .single();

  if (insertError || !intake) {
    console.error("Supabase insert failed:", insertError);
    return NextResponse.json(
      { error: "Database write failed", detail: insertError?.message },
      { status: 500 }
    );
  }

  // 2. Bestanden (logo + brand_document + pitch_deck); n8n synct ze later naar Drive.
  // De browser zet ze direct in Storage (pending/); hier verplaatsen we ze naar de intake-map.
  for (const u of UPLOAD_FIELDS) {
    const upload = data[u.formField] as IncomingFile | undefined;
    if (!upload?.document_filename) continue;
    try {
      const placed = await placeFile(supabase, intake.id, upload, u.formField);
      if (!placed) continue;
      const updatePayload = {
        [u.pathField]: placed.path,
        [u.filenameField]: placed.filename,
        [u.sizeField]: placed.size,
        [u.mimeField]: placed.mime,
      };
      await supabase
        .from("onboarding_intakes")
        .update(updatePayload as never)
        .eq("id", intake.id);
    } catch (e) {
      await supabase.from("onboarding_intake_logs").insert({
        intake_id: intake.id,
        event: `${u.formField}_upload_failed`,
        payload: { error: String(e), filename: upload.document_filename },
      });
    }
  }

  // 2b. Extra documenten (meerdere logo's/brand-assets + losse klantcases/contentstrategie-docs) -> extra_documents jsonb.
  // Volledig defensief: faalt dit, dan blijven de kern-submit + n8n-trigger gewoon doorgaan.
  try {
    const candidates: Array<{ file: IncomingFile; note: string }> = [];
    for (const a of data.brand_assets ?? []) {
      if (a?.document_filename) candidates.push({ file: a, note: a.note || "Brand-asset" });
    }
    if (data.klantcases_document?.document_filename) {
      candidates.push({ file: data.klantcases_document, note: "Klantcases" });
    }
    if (data.contentstrategie_document?.document_filename) {
      candidates.push({ file: data.contentstrategie_document, note: "Contentstrategie" });
    }

    const uploaded: Array<PlacedFile & { note: string }> = [];
    for (let i = 0; i < candidates.length; i++) {
      const { file, note } = candidates[i];
      try {
        const placed = await placeFile(supabase, intake.id, file, `extra-${i}`);
        if (placed) uploaded.push({ ...placed, note });
      } catch (e) {
        await supabase.from("onboarding_intake_logs").insert({
          intake_id: intake.id,
          event: "extra_document_upload_failed",
          payload: { error: String(e), note, filename: file.document_filename },
        });
      }
    }

    if (uploaded.length > 0) {
      await supabase
        .from("onboarding_intakes")
        .update({ extra_documents: uploaded as unknown as Json } as never)
        .eq("id", intake.id);
    }
  } catch (e) {
    await supabase.from("onboarding_intake_logs").insert({
      intake_id: intake.id,
      event: "extra_documents_error",
      payload: { error: String(e) },
    });
  }

  // 3. Trigger n8n webhook
  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${webhookToken}`,
      },
      body: JSON.stringify({
        intake_id: intake.id,
        reference_id: intake.reference_id,
      }),
    });

    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "");
      await supabase.from("onboarding_intake_logs").insert({
        intake_id: intake.id,
        event: "n8n_trigger_failed",
        payload: { status: upstream.status, body: upstreamBody.slice(0, 500) },
      });
    } else {
      await supabase.from("onboarding_intake_logs").insert({
        intake_id: intake.id,
        event: "n8n_triggered",
        payload: { status: upstream.status },
      });
    }
  } catch (e) {
    await supabase.from("onboarding_intake_logs").insert({
      intake_id: intake.id,
      event: "n8n_trigger_error",
      payload: { error: String(e) },
    });
  }

  return NextResponse.json({
    status: "received",
    reference_id: intake.reference_id,
    received_at: intake.created_at,
    intake_id: intake.id,
  });
}
