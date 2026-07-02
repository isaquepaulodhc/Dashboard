import { NextResponse } from "next/server";
import { refreshDashboardData } from "@/services/dashboardService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const data = await refreshDashboardData();
  return NextResponse.json(data);
}

