import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

// Tamano maximo permitido (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Tipos MIME permitidos
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporciono archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 }
      );
    }

    // Validar tamano
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Archivo muy grande. Maximo 10MB" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generar nombre unico
    const fileId = uuidv4();
    const session = sessionId || uuidv4();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${session}/${fileId}.${ext}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from("originals")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading to Supabase:", error);
      return NextResponse.json(
        { error: "Error al subir archivo" },
        { status: 500 }
      );
    }

    // Obtener URL publica
    const { data: urlData } = supabase.storage
      .from("originals")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        path: data.path,
        publicUrl: urlData.publicUrl,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        sessionId: session,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Función para validar path de archivo
// Previene path traversal y asegura formato correcto
function isValidFilePath(path: string): boolean {
  // No debe estar vacío
  if (!path || typeof path !== "string") return false;

  // No debe contener path traversal
  if (path.includes("..") || path.includes("//")) return false;

  // No debe empezar con / o contener caracteres peligrosos
  if (path.startsWith("/") || path.includes("\\")) return false;

  // Debe coincidir con formato esperado: sessionId/fileId.ext
  // sessionId es UUID, fileId es UUID, ext es 3-4 caracteres
  const pathRegex = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z]{2,4}$/i;
  if (!pathRegex.test(path)) return false;

  return true;
}

// Endpoint para eliminar archivo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Path no proporcionado" },
        { status: 400 }
      );
    }

    // Validar path para prevenir path traversal
    if (!isValidFilePath(path)) {
      console.warn(`Intento de eliminación con path inválido: ${path}`);
      return NextResponse.json(
        { error: "Path de archivo inválido" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.storage.from("originals").remove([path]);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar archivo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
