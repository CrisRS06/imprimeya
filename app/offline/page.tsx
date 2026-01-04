"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-muted/50 rounded-full p-6 mb-6">
        <WifiOff className="w-16 h-16 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Sin conexión</h1>

      <p className="text-muted-foreground mb-6 max-w-sm">
        Parece que no tienes conexión a internet. Verifica tu conexión e intenta
        de nuevo.
      </p>

      <Button onClick={handleRetry} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </Button>

      <p className="text-xs text-muted-foreground mt-8">
        Algunos datos guardados localmente aún están disponibles.
      </p>
    </div>
  );
}
