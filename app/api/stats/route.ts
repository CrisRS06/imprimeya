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

    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Calcular fechas de referencia usando zona horaria de Costa Rica
    const TIMEZONE = "America/Costa_Rica";
    const now = new Date();

    // Obtener fecha actual en Costa Rica
    const costaRicaDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    const todayStart = new Date(
      costaRicaDate.getFullYear(),
      costaRicaDate.getMonth(),
      costaRicaDate.getDate()
    );
    // Convertir de vuelta a UTC para queries
    const tzOffset = now.getTime() - costaRicaDate.getTime();
    todayStart.setTime(todayStart.getTime() + tzOffset);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Ejecutar todas las consultas en paralelo
    const [
      todayCreatedResult,
      todayDeliveredResult,
      todayPendingResult,
      todayRevenueResult,
      weekCreatedResult,
      weekDeliveredResult,
      weekRevenueResult,
      monthCreatedResult,
      monthDeliveredResult,
      monthRevenueResult,
      allTimeTotalResult,
      allTimeDeliveredResult,
      allTimeCancelledResult,
      allTimeRevenueResult,
    ] = await Promise.all([
      // HOY - Creados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),

      // HOY - Entregados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("delivered_at", todayStart.toISOString()),

      // HOY - Pendientes (creados hoy y aún pendientes)
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("created_at", todayStart.toISOString()),

      // HOY - Ingresos
      sb
        .from("orders")
        .select("total")
        .eq("status", "delivered")
        .gte("delivered_at", todayStart.toISOString()),

      // SEMANA - Creados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString()),

      // SEMANA - Entregados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("delivered_at", weekStart.toISOString()),

      // SEMANA - Ingresos
      sb
        .from("orders")
        .select("total")
        .eq("status", "delivered")
        .gte("delivered_at", weekStart.toISOString()),

      // MES - Creados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString()),

      // MES - Entregados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("delivered_at", monthStart.toISOString()),

      // MES - Ingresos
      sb
        .from("orders")
        .select("total")
        .eq("status", "delivered")
        .gte("delivered_at", monthStart.toISOString()),

      // TODO EL TIEMPO - Total
      sb
        .from("orders")
        .select("id", { count: "exact", head: true }),

      // TODO EL TIEMPO - Entregados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),

      // TODO EL TIEMPO - Cancelados
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled"),

      // TODO EL TIEMPO - Ingresos totales
      sb
        .from("orders")
        .select("total")
        .eq("status", "delivered"),
    ]);

    // Función helper para sumar totales
    const sumTotals = (result: { data: { total: number }[] | null }): number => {
      if (!result.data) return 0;
      return result.data.reduce((sum, order) => sum + (order.total || 0), 0);
    };

    const stats: StatsResponse = {
      today: {
        created: todayCreatedResult.count || 0,
        delivered: todayDeliveredResult.count || 0,
        pending: todayPendingResult.count || 0,
        revenue: sumTotals(todayRevenueResult),
      },
      week: {
        created: weekCreatedResult.count || 0,
        delivered: weekDeliveredResult.count || 0,
        revenue: sumTotals(weekRevenueResult),
      },
      month: {
        created: monthCreatedResult.count || 0,
        delivered: monthDeliveredResult.count || 0,
        revenue: sumTotals(monthRevenueResult),
      },
      allTime: {
        total: allTimeTotalResult.count || 0,
        delivered: allTimeDeliveredResult.count || 0,
        cancelled: allTimeCancelledResult.count || 0,
        revenue: sumTotals(allTimeRevenueResult),
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
