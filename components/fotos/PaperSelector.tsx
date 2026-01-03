"use client";

import { motion } from "framer-motion";
import { CheckIcon, FileTextIcon, AwardIcon, LayersIcon, StickyNoteIcon, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAPERS, getPapersForProduct, type PaperConfig } from "@/lib/config/papers";
import { PAPER_SURCHARGES } from "@/lib/utils/price-calculator";
import { formatPrice } from "@/lib/utils/price-calculator";
import type { ProductType, PaperType } from "@/lib/supabase/types";

// Mapeo de iconName a componentes de icono
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-text": FileTextIcon,
  award: AwardIcon,
  layers: LayersIcon,
  "sticky-note": StickyNoteIcon,
  image: ImageIcon,
};

interface PaperSelectorProps {
  productType: ProductType;
  selectedPaper?: PaperType;
  onSelect: (paper: PaperType) => void;
}

export function PaperSelector({
  productType,
  selectedPaper,
  onSelect,
}: PaperSelectorProps) {
  const compatiblePapers = getPapersForProduct(productType);

  return (
    <div className="space-y-3">
      {compatiblePapers.map((paper, index) => {
        const isSelected = selectedPaper === paper.code;
        const IconComponent = iconMap[paper.iconName] || FileTextIcon;

        return (
          <motion.button
            key={paper.code}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(paper.code)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
              isSelected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            {/* Icono */}
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                isSelected ? "bg-primary/20" : "bg-gray-100"
              )}
            >
              <IconComponent
                className={cn(
                  "w-7 h-7",
                  isSelected ? "text-primary" : "text-gray-500"
                )}
              />
            </div>

            {/* Info del papel */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-semibold text-lg",
                    isSelected ? "text-black" : "text-gray-800"
                  )}
                >
                  {paper.displayName}
                </span>
                {paper.recommended && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
                    Recomendado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{paper.description}</p>
              {/* Precio del papel */}
              <p className={cn(
                "text-sm font-medium mt-1",
                isSelected ? "text-primary" : "text-gray-600"
              )}>
                {PAPER_SURCHARGES[paper.code] === 0
                  ? "Incluido en precio base"
                  : `+${formatPrice(PAPER_SURCHARGES[paper.code])} por hoja`
                }
              </p>
            </div>

            {/* Check indicator */}
            {isSelected && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <CheckIcon className="w-5 h-5 text-black" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// Version compacta para el resumen
export function PaperBadge({ paperType }: { paperType: PaperType }) {
  const paper = PAPERS[paperType];
  if (!paper) return null;

  const IconComponent = iconMap[paper.iconName] || FileTextIcon;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
      <IconComponent className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {paper.displayName}
      </span>
    </div>
  );
}
