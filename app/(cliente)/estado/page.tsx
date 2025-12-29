"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";

export default function ConsultarEstadoPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar el codigo (quitar espacios y guiones)
    const cleanCode = codigo.replace(/[\s-]/g, "").toUpperCase();

    if (cleanCode.length !== 6) {
      setError("El codigo debe tener 6 caracteres");
      return;
    }

    // Validar que solo tenga caracteres validos
    const validChars = /^[A-Z0-9]+$/;
    if (!validChars.test(cleanCode)) {
      setError("El codigo solo puede contener letras y numeros");
      return;
    }

    setError(null);
    router.push(`/estado/${cleanCode}`);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCodigo(value);
    if (error) setError(null);
  };

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-black">Consultar pedido</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <SearchIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-black">Buscar pedido</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ingresa el codigo de 6 digitos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  value={codigo}
                  onChange={handleCodeChange}
                  placeholder="ABC123"
                  maxLength={7}
                  className="text-center text-2xl font-mono tracking-[0.3em] h-14 rounded-xl border-gray-200 focus:border-primary focus:ring-primary uppercase"
                  autoComplete="off"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive mt-2 text-center">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl"
                disabled={codigo.length === 0}
              >
                <SearchIcon className="w-5 h-5 mr-2" />
                Buscar
              </Button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              El codigo se encuentra en la confirmacion de tu pedido
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
