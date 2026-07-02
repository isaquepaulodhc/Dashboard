import { NextResponse } from "next/server";
import { getDashboardHealth } from "@/services/dashboardService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getDashboardHealth();
  return NextResponse.json(health);
}
