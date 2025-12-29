"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ImageIcon,
  FileTextIcon,
  LayoutGridIcon,
  ArrowRightIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

interface ProductOption {
  id: ProductType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const productOptions: ProductOption[] = [
  {
    id: "photo",
    title: "Fotos",
    description: "4x6, 5x7, wallet y mas",
    icon: ImageIcon,
    href: "/fotos",
  },
  {
    id: "document",
    title: "Documentos",
    description: "PDF, Word a pagina completa",
    icon: FileTextIcon,
    href: "/documento",
  },
  {
    id: "poster",
    title: "Poster",
    description: "Una foto en varias hojas",
    icon: LayoutGridIcon,
    href: "/nuevo?type=poster",
  },
];

export default function HomePage() {
  const router = useRouter();

  const handleSelect = (option: ProductOption) => {
    router.push(option.href);
  };

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header con Logo Simple */}
      <header className="px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <Image
            src="/logo-simple.png"
            alt="Simple! - Vive mejor, al mejor precio"
            width={200}
            height={80}
            priority
            className="h-16 w-auto"
          />
          <div className="mt-4 bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1.5 rounded-full">
            <span className="text-white font-bold text-sm tracking-wide">
              ImprimeYA
            </span>
          </div>
        </motion.div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-8">
        <div className="max-w-md mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-gray-500 mb-8"
          >
            Que quieres imprimir hoy?
          </motion.p>

          {/* Product Grid */}
          <div className="space-y-4">
            {productOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "group w-full flex items-center gap-5 p-5 rounded-2xl",
                    "bg-white border border-gray-100",
                    "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                    "transition-all duration-300"
                  )}
                >
                  {/* Icon */}
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

                  {/* Text */}
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-black">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRightIcon
                    className={cn(
                      "w-5 h-5 text-gray-300",
                      "group-hover:text-primary group-hover:translate-x-1",
                      "transition-all duration-300"
                    )}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Info note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-gray-400">
              Todas las impresiones son en papel carta (8.5" x 11")
            </p>
          </motion.div>

          {/* Check order status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
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
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <Image
          src="/logo-simple.png"
          alt="Simple!"
          width={100}
          height={40}
          className="h-8 w-auto mx-auto opacity-40"
        />
      </footer>
    </div>
  );
}
