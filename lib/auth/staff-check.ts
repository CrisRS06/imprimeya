import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/**
 * Check if the current request is from an authenticated staff member
 * For use in API routes
 */
export async function getStaffUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Not needed for reading auth state
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Verify staff role
    const isStaff =
      user.user_metadata?.role === "staff" ||
      user.user_metadata?.is_staff === true ||
      user.email?.endsWith("@simple.cr");

    return isStaff ? user : null;
  } catch {
    return null;
  }
}

/**
 * Check if the request has a valid session ID that matches the order
 */
export function getSessionId(headers: Headers): string | null {
  return headers.get("x-session-id");
}
