"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockIcon, AlertCircleIcon, MailIcon } from "lucide-react";

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "not_staff" ? "Tu cuenta no tiene permisos de staff" : null
  );
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Credenciales incorrectas");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Error al iniciar sesion");
        setLoading(false);
        return;
      }

      // Verify staff role
      const isStaff =
        data.user.user_metadata?.role === "staff" ||
        data.user.user_metadata?.is_staff === true ||
        data.user.email?.endsWith("@simple.cr");

      if (!isStaff) {
        await supabase.auth.signOut();
        setError("Tu cuenta no tiene permisos de staff");
        setLoading(false);
        return;
      }

      // Redirect to dashboard or original destination
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Error de conexion");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <LockIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-black">Acceso Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ingresa tus credenciales de empleado
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Correo electronico
            </Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="tu@simple.cr"
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contrasena
            </Label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="********"
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Verificando...
              </span>
            ) : (
              "Iniciar sesion"
            )}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-6">
        ImprimeYA por Simple!
      </p>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <Suspense fallback={<LoginLoading />}>
        <StaffLoginForm />
      </Suspense>
    </div>
  );
}
