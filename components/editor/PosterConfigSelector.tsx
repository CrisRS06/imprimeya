"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  POSTER_CONFIGS,
  type PosterConfig,
  calculatePosterDimensions,
  formatPosterSize,
} from "@/lib/poster/config";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import { CheckIcon, GridIcon } from "lucide-react";

interface PosterConfigSelectorProps {
  selectedId: string | null;
  sizeName: PrintSizeName;
  onSelect: (config: PosterConfig) => void;
  className?: string;
}

// Mini preview del grid
function PosterGridPreview({
  config,
  isSelected,
}: {
  config: PosterConfig;
  isSelected: boolean;
}) {
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      cells.push(
        <div
          key={`${row}-${col}`}
          className="border border-gray-400 bg-sky-100"
          style={{
            gridColumn: col + 1,
            gridRow: row + 1,
          }}
        />
      );
    }
  }

  return (
    <div
      className={cn(
        "relative w-full aspect-square bg-white rounded-lg overflow-hidden border-2 p-1.5 transition-all",
        isSelected ? "border-sky-500 ring-2 ring-sky-200" : "border-gray-200"
      )}
    >
      <div
        className="w-full h-full grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, 1fr)`,
        }}
      >
        {cells}
      </div>

      {/* Check de seleccion */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

export function PosterConfigSelector({
  selectedId,
  sizeName,
  onSelect,
  className,
}: PosterConfigSelectorProps) {
  const printSize = PRINT_SIZES[sizeName];
  const selectedConfig = POSTER_CONFIGS.find((c) => c.id === selectedId);

  // Calcular dimensiones del poster seleccionado
  const dimensions = selectedConfig
    ? calculatePosterDimensions(
        selectedConfig,
        printSize.width,
        printSize.height
      )
    : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GridIcon className="w-5 h-5" />
          Configuracion del poster
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid de opciones */}
        <div className="grid grid-cols-4 gap-3">
          {POSTER_CONFIGS.map((config) => (
            <button
              key={config.id}
              onClick={() => onSelect(config)}
              className="text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
            >
              <PosterGridPreview
                config={config}
                isSelected={selectedId === config.id}
              />
              <p className="text-xs text-center mt-1 text-gray-700">
                {config.sheets} hojas
              </p>
            </button>
          ))}
        </div>

        {/* Info del poster seleccionado */}
        {selectedConfig && dimensions && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Configuracion:</span>
              <span className="font-medium">{selectedConfig.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tamano final:</span>
              <span className="font-medium">{formatPosterSize(dimensions)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Hojas necesarias:</span>
              <span className="font-medium">
                {selectedConfig.sheets}x {sizeName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedConfig.description}. Las hojas tendran marcas de
              alineacion para facilitar el ensamble.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
