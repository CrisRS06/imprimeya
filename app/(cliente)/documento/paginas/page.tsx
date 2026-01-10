"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { List, RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPdfPageCount,
  parsePageRanges,
  pagesToRangeString,
  processPdfForPrint,
  EncryptedPdfError,
  PdfScalingError,
  PageExtractionError,
} from "@/lib/utils/pdf-processor";
import { useDocumentStorage } from "@/hooks/useDocumentStorage";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronRightIcon,
  FileTextIcon,
} from "lucide-react";

// Row height for virtualized list
const ROW_HEIGHT = 48;

// Custom props for the row component (only what we pass, not index/style)
type RowCustomProps = {
  selectedPages: Set<number>;
  togglePage: (pageNum: number) => void;
};

// Row component for virtualized list using react-window's type helper
function CheckboxRow(props: RowComponentProps<RowCustomProps>) {
  const { index, style, selectedPages, togglePage } = props;
  const pageNum = index + 1;
  const isSelected = selectedPages.has(pageNum);

  return (
    <label
      style={style}
      className={cn(
        "flex items-center px-4 cursor-pointer border-b border-gray-100 transition-colors",
        isSelected ? "bg-emerald-50" : "bg-white hover:bg-gray-50"
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => togglePage(pageNum)}
        className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
      />
      <span className={cn(
        "ml-3 text-base",
        isSelected ? "text-emerald-700 font-medium" : "text-gray-700"
      )}>
        Pagina {pageNum}
      </span>
      {isSelected && (
        <CheckCircle2Icon className="ml-auto w-5 h-5 text-emerald-500" />
      )}
    </label>
  );
}

export default function SeleccionarPaginasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { getDocument, updateDocument } = useDocumentStorage();
  const [numPages, setNumPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [containerHeight, setContainerHeight] = useState(300);

  // Measure container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Load PDF from IndexedDB
  useEffect(() => {
    const loadPdf = async () => {
      const docId = localStorage.getItem("currentDocumentId");
      if (!docId) {
        setError("No se encontro el documento. Por favor sube un PDF nuevamente.");
        setLoading(false);
        return;
      }

      try {
        setDocumentId(docId);
        const doc = await getDocument(docId);
        setPdfData(doc.pdfData);

        // Get page count from stored document
        const pageCount = doc.pageCount;
        setNumPages(pageCount);

        // Select all pages by default
        const allPages = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
        setSelectedPages(allPages);
        setRangeInput(pagesToRangeString(Array.from(allPages)));
      } catch (err) {
        // Handle specific error types with descriptive messages
        if (err instanceof EncryptedPdfError) {
          setError(err.message);
        } else {
          setError("Error al cargar el documento. Por favor sube un PDF nuevamente.");
        }
      }
      setLoading(false);
    };

    loadPdf();
  }, [getDocument]);

  const togglePage = useCallback((pageNum: number) => {
    setSelectedPages((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(pageNum)) {
        newSelected.delete(pageNum);
      } else {
        newSelected.add(pageNum);
      }
      // Update range input
      setRangeInput(pagesToRangeString(Array.from(newSelected)));
      return newSelected;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allPages = new Set(Array.from({ length: numPages }, (_, i) => i + 1));
    setSelectedPages(allPages);
    setRangeInput(pagesToRangeString(Array.from(allPages)));
  }, [numPages]);

  const selectNone = useCallback(() => {
    setSelectedPages(new Set());
    setRangeInput("");
  }, []);

  const selectFirst10 = useCallback(() => {
    const first10 = new Set(Array.from({ length: Math.min(10, numPages) }, (_, i) => i + 1));
    setSelectedPages(first10);
    setRangeInput(pagesToRangeString(Array.from(first10)));
  }, [numPages]);

  const handleRangeInputChange = useCallback((value: string) => {
    setRangeInput(value);
    const parsed = parsePageRanges(value, numPages);
    setSelectedPages(new Set(parsed));
  }, [numPages]);

  const handleContinue = async () => {
    if (!pdfData || selectedPages.size === 0 || !documentId) return;

    setProcessing(true);
    try {
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const processedPdf = await processPdfForPrint(pdfData, sortedPages);

      // Update document in IndexedDB with processed PDF
      await updateDocument(documentId, {
        pdfData: processedPdf.buffer as ArrayBuffer,
        pageCount: selectedPages.size,
        selectedPages: sortedPages,
      });

      // Update document info in localStorage
      const docInfo = localStorage.getItem("uploadedDocument");
      if (docInfo) {
        const info = JSON.parse(docInfo);
        info.pageCount = selectedPages.size;
        info.selectedPages = sortedPages;
        localStorage.setItem("uploadedDocument", JSON.stringify(info));
      }

      router.push("/documento/opciones");
    } catch (err) {
      // Handle specific error types with descriptive messages
      if (err instanceof EncryptedPdfError) {
        setError(err.message);
      } else if (err instanceof PdfScalingError) {
        setError(err.message);
      } else if (err instanceof PageExtractionError) {
        setError(err.message);
      } else {
        setError("Error al procesar el PDF. Intenta con otro archivo.");
      }
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex flex-col bg-white">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
              <p className="text-gray-600 mt-2">{error}</p>
            </div>
            <Button
              onClick={() => router.push("/documento")}
              className="w-full"
            >
              Volver a subir documento
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 bg-gradient-to-b from-emerald-50 to-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/documento")}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              Seleccionar paginas
            </h1>
            <p className="text-sm text-gray-500">
              Total: {numPages} {numPages === 1 ? "pagina" : "paginas"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <FileTextIcon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* Quick selection buttons */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={selectAll}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              selectedPages.size === numPages
                ? "bg-emerald-500 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            )}
          >
            Todas
          </button>
          <button
            onClick={selectNone}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              selectedPages.size === 0
                ? "bg-emerald-500 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            )}
          >
            Ninguna
          </button>
          {numPages > 10 && (
            <button
              onClick={selectFirst10}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                selectedPages.size === 10 && Array.from({ length: 10 }, (_, i) => i + 1).every(p => selectedPages.has(p))
                  ? "bg-emerald-500 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
              )}
            >
              Primeras 10
            </button>
          )}
        </div>
      </div>

      {/* Range input */}
      <div className="px-4 py-3 border-b">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rango personalizado
        </label>
        <input
          type="text"
          value={rangeInput}
          onChange={(e) => handleRangeInputChange(e.target.value)}
          placeholder="Ej: 1-5, 8, 10-12"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separa con comas, usa guiones para rangos
        </p>
      </div>

      {/* Checkbox list - Virtualized */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {containerHeight > 0 && (
          <List<RowCustomProps>
            rowComponent={CheckboxRow}
            rowCount={numPages}
            rowHeight={ROW_HEIGHT}
            rowProps={{
              selectedPages,
              togglePage,
            }}
            style={{ width: "100%", height: containerHeight }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-4 bg-white border-t shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {selectedPages.size} de {numPages}{" "}
            {numPages === 1 ? "pagina" : "paginas"}
          </span>
          {selectedPages.size > 0 && (
            <span className="text-sm font-medium text-emerald-600">
              <CheckCircle2Icon className="w-4 h-4 inline mr-1" />
              Listo
            </span>
          )}
        </div>
        <Button
          onClick={handleContinue}
          disabled={selectedPages.size === 0 || processing}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-2xl transition-all",
            selectedPages.size > 0
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500"
          )}
        >
          {processing ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Procesando...
            </span>
          ) : (
            <>
              Continuar ({selectedPages.size}{" "}
              {selectedPages.size === 1 ? "pagina" : "paginas"})
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
