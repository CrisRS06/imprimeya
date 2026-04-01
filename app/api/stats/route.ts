import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStaffUser } from "@/lib/auth/staff-check";
import { log, generateRequestId } from "@/lib/logger";

interface StatsResponse {
  today: {
    created: number;
    delivered: number;
    pending: number;
    revenue: number;
  };
  week: {
    created: number;
    delivered: number;
    revenue: number;
  };
  month: {
    created: number;
    delivered: number;
    revenue: number;
  };
  allTime: {
    total: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  };
}

// Helper: sum totals from a Supabase result
function sumTotals(result: { data: { total: number }[] | null }): number {
  if (!result.data) return 0;
  return result.data.reduce((sum, order) => sum + (order.total || 0), 0);
}

// GET /api/stats - Obtener métricas del dashboard (solo staff)
export async function GET() {
  const requestId = generateRequestId();

  try {
    // Verificar autenticación de staff
    const staffUser = await getStaffUser();
    if (!staffUser) {
      log.warn("Unauthorized stats access attempt", { requestId });
      return NextResponse.json(
        { error: "No autorizado. Solo personal de staff." },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Calcular fechas de referencia usando zona horaria de Costa Rica
    const TIMEZONE = "America/Costa_Rica";
    const now = new Date();

    const costaRicaDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    const todayStart = new Date(
      costaRicaDate.getFullYear(),
      costaRicaDate.getMonth(),
      costaRicaDate.getDate()
    );
    const tzOffset = now.getTime() - costaRicaDate.getTime();
    todayStart.setTime(todayStart.getTime() + tzOffset);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const todayISO = todayStart.toISOString();
    const weekISO = weekStart.toISOString();
    const monthISO = monthStart.toISOString();

    // Batch 1: All count queries (cheap — head:true, no data transfer)
    const [
      todayCreated, todayDelivered, todayPending,
      weekCreated, weekDelivered,
      monthCreated, monthDelivered,
      allTotal, allDelivered, allCancelled,
    ] = await Promise.all([
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered").gte("delivered_at", todayISO),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", todayISO),
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", weekISO),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered").gte("delivered_at", weekISO),
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", monthISO),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered").gte("delivered_at", monthISO),
      sb.from("orders").select("id", { count: "exact", head: true }),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    ]);

    // Batch 2: Revenue queries (need data for sum — only fetch 'total' column)
    const [todayRevenue, weekRevenue, monthRevenue, allRevenue] = await Promise.all([
      sb.from("orders").select("total").eq("status", "delivered").gte("delivered_at", todayISO),
      sb.from("orders").select("total").eq("status", "delivered").gte("delivered_at", weekISO),
      sb.from("orders").select("total").eq("status", "delivered").gte("delivered_at", monthISO),
      sb.from("orders").select("total").eq("status", "delivered"),
    ]);

    const stats: StatsResponse = {
      today: {
        created: todayCreated.count || 0,
        delivered: todayDelivered.count || 0,
        pending: todayPending.count || 0,
        revenue: sumTotals(todayRevenue),
      },
      week: {
        created: weekCreated.count || 0,
        delivered: weekDelivered.count || 0,
        revenue: sumTotals(weekRevenue),
      },
      month: {
        created: monthCreated.count || 0,
        delivered: monthDelivered.count || 0,
        revenue: sumTotals(monthRevenue),
      },
      allTime: {
        total: allTotal.count || 0,
        delivered: allDelivered.count || 0,
        cancelled: allCancelled.count || 0,
        revenue: sumTotals(allRevenue),
      },
    };

    log.debug("Stats fetched successfully", { requestId });

    return NextResponse.json({ stats });
  } catch (error) {
    log.error("Error in GET /api/stats", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
