"use client";

import { useState, useCallback } from "react";
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

interface UploadedDocument {
  id: string;
  file: File;
  name: string;
  type: "pdf" | "docx" | "doc";
  size: number;
  pageCount: number | null;
  status: "processing" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
};

export default function DocumentoPage() {
  const router = useRouter();
  const { setProductType } = useOrder();
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getFileType = (file: File): "pdf" | "docx" | "doc" | null => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".docx")) return "docx";
    if (name.endsWith(".doc")) return "doc";
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

    // For now, we'll set a placeholder page count
    // In a full implementation, we'd use pdf-lib to extract page count
    let pageCount: number | null = null;

    // Try to get page count for PDFs using a simple approach
    if (fileType === "pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder("latin1").decode(arrayBuffer);
        // Simple regex to count /Type /Page occurrences (rough estimate)
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        pageCount = matches ? matches.length : 1;
      } catch {
        pageCount = 1; // Default to 1 if we can't determine
      }
    } else {
      // For Word docs, we'll estimate based on file size (rough estimate)
      pageCount = Math.max(1, Math.ceil(file.size / 50000));
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
          if (e.code === "file-too-large") return "Archivo muy grande (max 20MB)";
          if (e.code === "file-invalid-type") return "Formato no soportado. Usa PDF o Word";
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
    maxSize: 20 * 1024 * 1024, // 20MB
    maxFiles: 1,
    disabled: isProcessing,
  });

  const canContinue = document && document.status === "done";

  const handleContinue = () => {
    if (!document) return;

    setProductType("document");

    // Save to sessionStorage
    sessionStorage.setItem(
      "uploadedDocument",
      JSON.stringify({
        name: document.name,
        type: document.type,
        size: document.size,
        pageCount: document.pageCount,
      })
    );

    router.push("/documento/opciones");
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
                PDF o Word - Max 20MB
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
          <h3 className="font-medium text-emerald-900 mb-2">Formatos aceptados</h3>
          <ul className="text-sm text-emerald-700 space-y-1">
            <li>PDF (.pdf) - Recomendado</li>
            <li>Word (.docx, .doc)</li>
          </ul>
          <p className="text-xs text-emerald-600 mt-3">
            Se imprime a pagina completa en papel carta
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
