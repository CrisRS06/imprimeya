import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/**
 * Check if the current request is from an authenticated staff member.
 * Uses staff_members table as the authoritative source (not user_metadata).
 * For use in API routes.
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

    // Verify staff role against staff_members table (service role bypasses RLS)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: staffMember } = await serviceClient
      .from("staff_members")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    return staffMember ? user : null;
  } catch (error) {
    console.error("[staff-check] Error verificando usuario staff:", error);
    return null;
  }
}

/**
 * Check if the request has a valid session ID that matches the order
 */
export function getSessionId(headers: Headers): string | null {
  return headers.get("x-session-id");
}
