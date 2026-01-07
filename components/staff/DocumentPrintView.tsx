"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/price-calculator";
import { toast } from "sonner";
import {
  PrinterIcon,
  ArrowLeftIcon,
  Loader2Icon,
  CheckCircleIcon,
  FileTextIcon,
} from "lucide-react";

interface DocumentPrintViewProps {
  order: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    total: number;
    pricePerUnit: number;
    printCost: number;
    paperSurcharge: number;
    productType: string;
    paperDisplayName: string;
    isColor: boolean;
  };
  print: {
    imageUrls: string[];
    totalPhotos: number;
  };
  onMarkDelivered: () => Promise<void>;
  markingDelivered: boolean;
}

export function DocumentPrintView({
  order,
  print,
  onMarkDelivered,
  markingDelivered,
}: DocumentPrintViewProps) {
  const router = useRouter();
  const [printing, setPrinting] = useState(false);

  const pdfUrl = print.imageUrls[0];
  const pageCount = print.totalPhotos;

  const handlePrint = async () => {
    if (!pdfUrl) {
      toast.error("No se encontro el documento");
      return;
    }

    setPrinting(true);

    try {
      // Crear iframe oculto para impresion
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // Fallback: abrir en nueva pestana
            window.open(pdfUrl, "_blank");
          }
          setTimeout(() => {
            iframe.remove();
            setPrinting(false);
          }, 2000);
        }, 500);
      };

      iframe.onerror = () => {
        iframe.remove();
        window.open(pdfUrl, "_blank");
        setPrinting(false);
      };
    } catch (err) {
      toast.error("Error al imprimir");
      console.error(err);
      setPrinting(false);
    }
  };

  return (
    <>
      {/* Barra de controles - NO se imprime */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900">
                Pedido {order.code}
              </h1>
              <p className="text-sm text-gray-500">
                Documento - {pageCount} {pageCount === 1 ? "pagina" : "paginas"}
              </p>
            </div>
          </div>

          <Button
            onClick={handlePrint}
            disabled={printing}
            size="lg"
            className="px-6"
          >
            {printing ? (
              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <PrinterIcon className="w-5 h-5 mr-2" />
            )}
            Imprimir
          </Button>
        </div>
      </div>

      {/* Info del pedido - NO se imprime */}
      <div className="no-print bg-gray-50 border-b pt-20 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tipo de papel - PROMINENTE */}
          <div className="bg-amber-100 border-2 border-amber-400 rounded-xl px-6 py-4 mb-4">
            <p className="text-amber-700 text-sm font-medium">USAR PAPEL</p>
            <p className="text-3xl font-bold text-amber-900 uppercase tracking-wide">
              {order.paperDisplayName}
            </p>
          </div>

          {/* Detalles del documento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Tipo:</span>
              <span className="ml-2 font-medium">Documento PDF</span>
            </div>
            <div>
              <span className="text-gray-500">Impresion:</span>
              <span className="ml-2 font-medium">
                {order.isColor ? "A color" : "Blanco y negro"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Paginas:</span>
              <span className="ml-2 font-medium">{pageCount}</span>
            </div>
          </div>

          {/* Precio y boton de entregado */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="bg-emerald-50 rounded-xl px-4 sm:px-6 py-4 w-full sm:w-auto sm:min-w-[280px]">
              <p className="text-sm text-emerald-600 font-medium mb-3">
                Desglose ({pageCount} {pageCount === 1 ? "pagina" : "paginas"})
              </p>
              <div className="text-sm space-y-2 font-mono">
                <div className="flex justify-between text-emerald-700">
                  <span>Impresion {order.isColor ? "color" : "B/N"}</span>
                  <span>
                    {formatPrice(order.printCost)} x {pageCount} ={" "}
                    {formatPrice(order.printCost * pageCount)}
                  </span>
                </div>
                {order.paperSurcharge > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Papel {order.paperDisplayName}</span>
                    <span>
                      {formatPrice(order.paperSurcharge)} x {pageCount} ={" "}
                      {formatPrice(order.paperSurcharge * pageCount)}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-emerald-300 mt-3 pt-3 flex justify-between items-center">
                <span className="text-emerald-700 font-bold">TOTAL:</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            {order.status !== "delivered" && (
              <Button
                onClick={onMarkDelivered}
                disabled={markingDelivered}
                className="h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-xl"
              >
                {markingDelivered ? (
                  <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                )}
                Marcar como Entregado
              </Button>
            )}

            {order.status === "delivered" && (
              <div className="bg-gray-100 rounded-xl px-6 py-3 text-center">
                <p className="text-sm text-gray-500">Estado</p>
                <p className="text-lg font-semibold text-gray-700">
                  Ya entregado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visor de PDF */}
      <div className="pt-4 pb-8 px-4 bg-gray-100 min-h-[60vh]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-2">
              <FileTextIcon className="w-4 h-4" />
              <span className="text-sm">Vista previa del documento</span>
            </div>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[70vh]"
                title="Vista previa PDF"
              />
            ) : (
              <div className="h-[70vh] flex items-center justify-center text-gray-500">
                No se pudo cargar el documento
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
