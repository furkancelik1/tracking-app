import { NextResponse } from "next/server";
import { getLeagueLeaderboard } from "@/actions/leaderboard.actions";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getLeagueLeaderboard();
    return NextResponse.json<ApiResponse<typeof data>>({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sunucu hatası",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
