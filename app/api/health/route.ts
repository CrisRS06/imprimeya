import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    storage: CheckResult;
  };
}

interface CheckResult {
  status: "pass" | "fail";
  latency_ms: number;
  error?: string;
}

const startTime = Date.now();

/**
 * GET /api/health - Health check endpoint for monitoring
 * Returns status of critical dependencies
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const version = process.env.npm_package_version || "1.0.0";

  const checks: HealthStatus["checks"] = {
    database: { status: "fail", latency_ms: 0 },
    storage: { status: "fail", latency_ms: 0 },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("orders")
      .select("id")
      .limit(1);

    checks.database = {
      status: error ? "fail" : "pass",
      latency_ms: Date.now() - dbStart,
      error: error?.message,
    };
  } catch (err) {
    checks.database = {
      status: "fail",
      latency_ms: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check storage connectivity
  try {
    const storageStart = Date.now();
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).storage
      .from("originals")
      .list("", { limit: 1 });

    checks.storage = {
      status: error ? "fail" : "pass",
      latency_ms: Date.now() - storageStart,
      error: error?.message,
    };
  } catch (err) {
    checks.storage = {
      status: "fail",
      latency_ms: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Determine overall status
  const allPass = Object.values(checks).every((c) => c.status === "pass");
  const anyPass = Object.values(checks).some((c) => c.status === "pass");

  let overallStatus: HealthStatus["status"];
  if (allPass) {
    overallStatus = "healthy";
  } else if (anyPass) {
    overallStatus = "degraded";
  } else {
    overallStatus = "unhealthy";
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp,
    version,
    uptime,
    checks,
  };

  // Return appropriate HTTP status
  const httpStatus = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
