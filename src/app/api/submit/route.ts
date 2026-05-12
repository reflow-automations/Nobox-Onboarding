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
    website: data.website ?? null,
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
    brand_notes: data.branding?.notes || null,
    brand_color_hex: data.brand_color_hex || null,
    foto_video_drive_link: data.foto_video_drive_link ?? null,
    klantcases_text: data.klantcases_text || null,
    contentstrategie_text: data.contentstrategie_text || null,
    voorkeur_vergader_tijd: data.voorkeur_vergader_tijd,
    bijzonderheden: data.bijzonderheden || null,
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

  // 2. Upload files (logo + brand_document + pitch_deck) — all routed to Drive later by n8n
  for (const u of UPLOAD_FIELDS) {
    const upload = data[u.formField] as
      | {
          document_filename?: string;
          document_data?: string;
          document_size?: number;
          document_mime?: string;
        }
      | undefined;

    if (!upload?.document_data || !upload.document_filename || upload.document_data.length === 0) {
      continue;
    }

    try {
      const buffer = Buffer.from(upload.document_data, "base64");
      const safeFilename = upload.document_filename.replace(/[^\w.\-]/g, "_");
      const path = `${intake.id}/${u.formField}-${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("onboarding-docs")
        .upload(path, buffer, {
          contentType: upload.document_mime || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        await supabase.from("onboarding_intake_logs").insert({
          intake_id: intake.id,
          event: `${u.formField}_upload_failed`,
          payload: { error: uploadError.message, path },
        });
      } else {
        const updatePayload = {
          [u.pathField]: path,
          [u.filenameField]: safeFilename,
          [u.sizeField]: buffer.byteLength,
          [u.mimeField]: upload.document_mime || null,
        };
        await supabase
          .from("onboarding_intakes")
          .update(updatePayload as never)
          .eq("id", intake.id);
      }
    } catch (e) {
      await supabase.from("onboarding_intake_logs").insert({
        intake_id: intake.id,
        event: `${u.formField}_upload_error`,
        payload: { error: String(e) },
      });
    }
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
