import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { log, generateRequestId } from "@/lib/logger";

/**
 * POST /api/documents/upload-url
 *
 * Genera una URL firmada para subir documentos PDF directamente a Supabase Storage.
 * Esto bypassa RLS y permite uploads de hasta 50MB sin pasar por el servidor.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { sessionId } = body;

    const supabase = await createServiceClient();
    const fileId = uuidv4();
    const session = sessionId || uuidv4();
    const path = `${session}/${fileId}.pdf`;

    // Generar URL firmada para upload (valida 1 hora)
    const { data, error } = await supabase.storage
      .from("originals")
      .createSignedUploadUrl(path);

    if (error) {
      log.error("Error creating signed upload URL", error, { requestId, path });
      return NextResponse.json(
        { error: "Error generando URL de upload" },
        { status: 500 }
      );
    }

    log.info("Signed upload URL created", { requestId, path });

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: path,
      token: data.token,
      sessionId: session,
    });
  } catch (error) {
    log.error("Unhandled error in upload-url", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
