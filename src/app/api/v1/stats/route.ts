import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserAnalytics } from "@/lib/analytics";
import type { ApiResponse } from "@/types";

// GET /api/v1/stats — son 30 gün analytics
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const analytics = await getUserAnalytics(userId, 30);

    return NextResponse.json<ApiResponse<typeof analytics>>({
      success: true,
      data: analytics,
    });
  } catch (err) {
    console.error("[GET /api/v1/stats] Hata:", err);
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
