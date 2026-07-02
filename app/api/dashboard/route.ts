import { NextResponse } from "next/server";
import { getDashboardData } from "@/services/dashboardService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDashboardData(false);
  return NextResponse.json(data);
}

