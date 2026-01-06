import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Allowed origins for CSRF protection
function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests without origin (same-origin requests from browser)
  if (!origin) {
    return true;
  }

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return true;
    }
  }

  // Check if origin matches the host
  try {
    const originUrl = new URL(origin);
    const expectedHost = host?.split(":")[0]; // Remove port
    return originUrl.hostname === expectedHost;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // CSRF protection for state-changing API requests
  const isApiMutation = pathname.startsWith("/api/") &&
    (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE");

  if (isApiMutation && !isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Origen no permitido" },
      { status: 403 }
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected staff routes
  const isStaffRoute = pathname.startsWith("/dashboard") ||
                       pathname.startsWith("/imprimir") ||
                       pathname.startsWith("/pedido");

  // Protected staff API routes
  const isStaffApiRoute = pathname === "/api/orders" && request.method === "GET";
  const isStaffApiMutation = (pathname.startsWith("/api/orders/") &&
                              (request.method === "PATCH" || request.method === "DELETE"));

  // Staff login route
  const isStaffLoginRoute = pathname === "/staff/login";

  if (isStaffRoute || isStaffApiRoute || isStaffApiMutation) {
    if (!user) {
      // For API routes, return 401
      if (isStaffApiRoute || isStaffApiMutation) {
        return NextResponse.json(
          { error: "No autorizado. Inicia sesion como staff." },
          { status: 401 }
        );
      }
      // For page routes, redirect to staff login
      const url = request.nextUrl.clone();
      url.pathname = "/staff/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Check if user has staff role via user metadata
    // NOTA: Solo verificar metadata, NO dominio de email (inseguro)
    const isStaff = user.user_metadata?.role === "staff" ||
                    user.user_metadata?.is_staff === true;

    if (!isStaff) {
      if (isStaffApiRoute || isStaffApiMutation) {
        return NextResponse.json(
          { error: "Acceso denegado. Solo personal autorizado." },
          { status: 403 }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/staff/login";
      url.searchParams.set("error", "not_staff");
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated staff users away from login page
  if (isStaffLoginRoute && user) {
    const isStaff = user.user_metadata?.role === "staff" ||
                    user.user_metadata?.is_staff === true;
    if (isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
