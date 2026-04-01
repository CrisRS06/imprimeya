"use client";

import { useRouter } from "next/navigation";
import {
  ImageIcon,
  FileTextIcon,
  ArrowRightIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const productOptions = [
  {
    id: "photo",
    title: "Imágenes",
    description: "4x6, 5x7, wallet y mas",
    icon: ImageIcon,
    href: "/fotos",
  },
  {
    id: "document",
    title: "Documentos",
    description: "PDF a página completa",
    icon: FileTextIcon,
    href: "/documento",
  },
] as const;

export function HomeButtons() {
  const router = useRouter();

  return (
    <>
      {/* Product Grid */}
      <div className="space-y-4">
        {productOptions.map((option, index) => {
          const IconComponent = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => router.push(option.href)}
              className={cn(
                "group w-full flex items-center gap-5 p-5 rounded-2xl",
                "bg-white border border-gray-100",
                "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                "active:scale-[0.98] transition-all duration-300",
                "animate-fade-in-up",
                index === 0 && "animation-delay-100",
                index === 1 && "animation-delay-200",
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  "bg-gray-50 group-hover:bg-primary/10",
                  "transition-colors duration-300"
                )}
              >
                <IconComponent
                  className={cn(
                    "w-7 h-7 text-gray-400",
                    "group-hover:text-primary",
                    "transition-colors duration-300"
                  )}
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-black">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {option.description}
                </p>
              </div>
              <ArrowRightIcon
                className={cn(
                  "w-5 h-5 text-gray-300",
                  "group-hover:text-primary group-hover:translate-x-1",
                  "transition-all duration-300"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Check order status */}
      <div className="mt-8 animate-fade-in-up animation-delay-600">
        <button
          onClick={() => router.push("/estado")}
          className={cn(
            "w-full flex items-center justify-center gap-3 py-4 rounded-xl",
            "border border-gray-100 bg-gray-50/50",
            "hover:bg-gray-100 hover:border-gray-200",
            "transition-all duration-300"
          )}
        >
          <SearchIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            Consultar estado de pedido
          </span>
        </button>
      </div>
    </>
  );
}
