"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileTextIcon,
  UploadCloudIcon,
  XIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  FileIcon,
} from "lucide-react";
import { useDropzone, FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { getPdfPageCount, EncryptedPdfError } from "@/lib/utils/pdf-processor";
import { useDocumentStorage } from "@/hooks/useDocumentStorage";

interface UploadedDocument {
  id: string;
  file: File;
  name: string;
  type: "pdf";
  size: number;
  pageCount: number | null;
  status: "processing" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
};

export default function DocumentoPage() {
  const router = useRouter();
  const { setProductType } = useOrder();
  const { saveDocument, cleanupExpired } = useDocumentStorage();
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Limpiar documentos expirados al cargar la página
  useEffect(() => {
    cleanupExpired();
  }, [cleanupExpired]);

  const getFileType = (file: File): "pdf" | null => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processDocument = useCallback(async (file: File): Promise<UploadedDocument> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileType = getFileType(file);

    if (!fileType) {
      return {
        id,
        file,
        name: file.name,
        type: "pdf",
        size: file.size,
        pageCount: null,
        status: "error",
        error: "Formato no soportado",
      };
    }

    // Validar y obtener información del PDF
    let pageCount: number | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
      const header = String.fromCharCode(...headerBytes);

      // Validar firma PDF (%PDF-)
      if (!header.startsWith("%PDF-")) {
        return {
          id,
          file,
          name: file.name,
          type: "pdf",
          size: file.size,
          pageCount: null,
          status: "error",
          error: "Archivo PDF invalido o corrupto",
        };
      }

      // Contar páginas usando pdf-lib (más confiable que regex)
      pageCount = await getPdfPageCount(arrayBuffer);
    } catch (err) {
      if (err instanceof EncryptedPdfError) {
        return {
          id,
          file,
          name: file.name,
          type: "pdf",
          size: file.size,
          pageCount: null,
          status: "error",
          error: err.message,
        };
      }
      pageCount = 1; // Default si no se puede determinar
    }

    return {
      id,
      file,
      name: file.name,
      type: fileType,
      size: file.size,
      pageCount,
      status: "done",
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => {
          if (e.code === "file-too-large") return "Archivo muy grande (max 50MB)";
          if (e.code === "file-invalid-type") return "Solo se acepta formato PDF";
          return e.message;
        });
        toast.error(`${rejection.file.name}: ${errors.join(", ")}`);
      });

      if (acceptedFiles.length === 0) return;

      // Only accept one file
      const file = acceptedFiles[0];
      setIsProcessing(true);

      const processed = await processDocument(file);
      setDocument(processed);
      setIsProcessing(false);
    },
    [processDocument]
  );

  const removeDocument = () => {
    setDocument(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
    disabled: isProcessing,
  });

  const canContinue = document && document.status === "done";

  const handleContinue = async () => {
    if (!document) return;

    setIsProcessing(true);

    try {
      setProductType("document");

      // Guardar PDF en IndexedDB (soporta hasta 50MB+)
      const docId = await saveDocument(document.file, document.pageCount || 1);

      // Guardar solo metadata y referencia en localStorage
      localStorage.setItem("currentDocumentId", docId);
      localStorage.setItem(
        "uploadedDocument",
        JSON.stringify({
          name: document.name,
          type: document.type,
          size: document.size,
          pageCount: document.pageCount,
          documentId: docId,
        })
      );

      router.push("/documento/paginas");
    } catch (err) {
      console.error("Error preparing document:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al preparar el documento. Intenta de nuevo."
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-gray-900"
            >
              Documentos
            </motion.h1>
            <p className="text-sm text-gray-500">Paso 1 de 2: Sube tu documento</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <FileTextIcon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 h-1 rounded-full bg-emerald-500" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Upload Area */}
      <section className="flex-1 px-4 pb-4">
        {!document ? (
          <div
            {...getRootProps()}
            className={cn(
              "relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all min-h-[280px] flex flex-col items-center justify-center",
              isDragActive
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50",
              isProcessing && "opacity-50 cursor-wait"
            )}
          >
            <input {...getInputProps()} />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <UploadCloudIcon className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? "Suelta el documento aqui" : "Toca para agregar documento"}
              </p>
              <p className="text-sm text-gray-500 mt-1">o arrastra y suelta</p>
              <p className="text-xs text-gray-400 mt-4">
                Solo PDF - Max 50MB
              </p>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-2 border-gray-200 p-6"
          >
            <div className="flex items-start gap-4">
              {/* File icon */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-8 h-8 text-emerald-600" />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {document.name}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="uppercase font-medium text-emerald-600">
                    {document.type}
                  </span>
                  <span>{formatFileSize(document.size)}</span>
                </div>
                {document.pageCount && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">{document.pageCount}</span>{" "}
                    {document.pageCount === 1 ? "pagina" : "paginas"}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={removeDocument}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Change document link */}
            <div {...getRootProps()} className="mt-4">
              <input {...getInputProps()} />
              <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Cambiar documento
              </button>
            </div>
          </motion.div>
        )}
      </section>

      {/* Info box */}
      <section className="px-4 pb-4">
        <div className="bg-emerald-50 rounded-2xl p-4">
          <h3 className="font-medium text-emerald-900 mb-2">Formato aceptado</h3>
          <p className="text-sm text-emerald-700">PDF (.pdf)</p>
          <p className="text-xs text-emerald-600 mt-3">
            Se imprime a pagina completa en papel carta
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Tienes un Word?{" "}
            <a
              href="https://smallpdf.com/word-to-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 underline hover:text-emerald-700"
            >
              Convertilo a PDF gratis aqui
            </a>
          </p>
        </div>
      </section>

      {/* Continue Button */}
      <section className="px-4 pb-8 mt-auto">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isProcessing}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-2xl transition-all",
            canContinue
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500"
          )}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Procesando...
            </span>
          ) : canContinue ? (
            <>
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Continuar
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </>
          ) : (
            "Sube un documento"
          )}
        </Button>
      </section>
    </div>
  );
}
