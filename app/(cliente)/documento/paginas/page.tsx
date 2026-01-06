"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Grid } from "react-window";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  processPdfForPrint,
} from "@/lib/utils/pdf-processor";
import {
  ArrowLeftIcon,
  CheckIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronRightIcon,
} from "lucide-react";

// Dynamic import for react-pdf to avoid SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

// Configure PDF.js worker on client side only
if (typeof window !== "undefined") {
  import("react-pdf").then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  });
}

// Constants for virtualization
const COLUMNS = 3;
const ITEM_WIDTH = 110;
const ITEM_HEIGHT = 155;
const GAP = 12;

// Memoized thumbnail component for performance
interface PageThumbnailProps {
  pageNum: number;
  isSelected: boolean;
  onToggle: (pageNum: number) => void;
}

const PageThumbnail = memo(
  function PageThumbnail({ pageNum, isSelected, onToggle }: PageThumbnailProps) {
    return (
      <button
        onClick={() => onToggle(pageNum)}
        className={cn(
          "relative w-full h-full rounded-lg overflow-hidden border-2 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
          isSelected
            ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        {/* Checkbox indicator */}
        <div
          className={cn(
            "absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center z-10 transition-colors",
            isSelected
              ? "bg-emerald-500"
              : "bg-white border border-gray-300"
          )}
        >
          {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
        </div>

        {/* PDF Thumbnail */}
        <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
          <Page
            pageNumber={pageNum}
            width={80}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pointer-events-none"
          />
        </div>

        {/* Page number */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-1.5">
          <span className="text-white text-xs font-medium">{pageNum}</span>
        </div>

        {/* Selection overlay */}
        {!isSelected && (
          <div className="absolute inset-0 bg-gray-100/40 pointer-events-none" />
        )}
      </button>
    );
  },
  (prev, next) =>
    prev.pageNum === next.pageNum && prev.isSelected === next.isSelected
);

// Grid cell custom props (passed via cellProps)
interface GridCellCustomProps {
  numPages: number;
  selectedPages: Set<number>;
  togglePage: (pageNum: number) => void;
}

// Grid cell renderer for react-window v2
// Props from Grid: ariaAttributes, columnIndex, rowIndex, style
// Props from cellProps: numPages, selectedPages, togglePage
function GridCell(props: {
  ariaAttributes: { "aria-colindex": number; role: "gridcell" };
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & GridCellCustomProps) {
  const { columnIndex, rowIndex, style, numPages, selectedPages, togglePage } = props;
  const pageNum = rowIndex * COLUMNS + columnIndex + 1;

  if (pageNum > numPages) {
    return <div style={style} />;
  }

  const isSelected = selectedPages.has(pageNum);

  return (
    <div style={style} className="p-1.5">
      <PageThumbnail
        pageNum={pageNum}
        isSelected={isSelected}
        onToggle={togglePage}
      />
    </div>
  );
}

export default function SeleccionarPaginasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Measure container size for virtualization
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Load PDF from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("documentPdfData");
    if (!stored) {
      setError("No se encontro el documento. Por favor sube un PDF nuevamente.");
      setLoading(false);
      return;
    }

    try {
      const buffer = base64ToArrayBuffer(stored);
      setPdfData(buffer);
    } catch {
      setError("Error al cargar el documento");
    }
    setLoading(false);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Select all pages by default
    setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setError("Error al cargar el PDF. Intenta con otro archivo.");
  }, []);

  const togglePage = useCallback((pageNum: number) => {
    setSelectedPages((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(pageNum)) {
        newSelected.delete(pageNum);
      } else {
        newSelected.add(pageNum);
      }
      return newSelected;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
  }, [numPages]);

  const selectNone = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const handleContinue = async () => {
    if (!pdfData || selectedPages.size === 0) return;

    setProcessing(true);
    try {
      // Process PDF: extract selected pages and fit to letter size
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const processedPdf = await processPdfForPrint(pdfData, sortedPages);

      // Save processed PDF to sessionStorage
      const base64 = arrayBufferToBase64(processedPdf.buffer as ArrayBuffer);
      sessionStorage.setItem("documentPdfData", base64);

      // Update document info
      const docInfo = sessionStorage.getItem("uploadedDocument");
      if (docInfo) {
        const info = JSON.parse(docInfo);
        info.pageCount = selectedPages.size;
        info.selectedPages = sortedPages;
        sessionStorage.setItem("uploadedDocument", JSON.stringify(info));
      }

      router.push("/documento/opciones");
    } catch (err) {
      setError("Error al procesar el PDF. Intenta con otro archivo.");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate grid dimensions
  const columnWidth = containerSize.width > 0
    ? Math.floor((containerSize.width - GAP) / COLUMNS)
    : ITEM_WIDTH;
  const rowCount = Math.ceil(numPages / COLUMNS);

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
    <div className="min-h-full flex flex-col bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
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
              Elige las paginas que quieres imprimir
            </p>
          </div>
        </div>
      </header>

      {/* Quick selection buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
              selectedPages.size === numPages
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Todas ({numPages})
          </button>
          <button
            onClick={selectNone}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
              selectedPages.size === 0
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Ninguna
          </button>
        </div>
      </div>

      {/* Page grid - Virtualized */}
      <main ref={containerRef} className="flex-1 px-2 pb-4 overflow-hidden">
        {isClient && pdfData && (
          <Document
            file={{ data: pdfData }}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            {containerSize.width > 0 && containerSize.height > 0 && numPages > 0 && (
              <Grid
                cellComponent={GridCell}
                cellProps={{
                  numPages,
                  selectedPages,
                  togglePage,
                }}
                columnCount={COLUMNS}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={ITEM_HEIGHT}
                style={{ width: containerSize.width, height: containerSize.height }}
              />
            )}
          </Document>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 bg-white border-t">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {selectedPages.size} de {numPages}{" "}
            {numPages === 1 ? "pagina" : "paginas"}
          </span>
          {selectedPages.size > 0 && (
            <span className="text-sm font-medium text-emerald-600">
              <CheckCircle2Icon className="w-4 h-4 inline mr-1" />
              Listo para continuar
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
