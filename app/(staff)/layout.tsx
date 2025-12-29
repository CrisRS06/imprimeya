"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockIcon, LogOutIcon } from "lucide-react";

interface StaffLayoutProps {
  children: ReactNode;
}

// PIN simple para acceso al dashboard (en produccion usar Supabase Auth)
const STAFF_PIN = "1234";
const AUTH_KEY = "imprimeya_staff_auth";

export default function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Verificar auth al montar
  useEffect(() => {
    const saved = sessionStorage.getItem(AUTH_KEY);
    if (saved === "true") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin === STAFF_PIN) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    router.push("/");
  };

  // Loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <LockIcon className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-black">Acceso Staff</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ingresa el PIN para acceder
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="****"
                  className="text-center text-2xl tracking-[0.5em] h-14 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive text-center mt-2">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl"
                disabled={pin.length < 4}
              >
                Entrar
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            ImprimeYA por Simple!
          </p>
        </div>
      </div>
    );
  }

  // Authenticated layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-black">
              Imprime<span className="text-primary">YA</span>
            </h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Staff
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-500 hover:text-black"
          >
            <LogOutIcon className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
