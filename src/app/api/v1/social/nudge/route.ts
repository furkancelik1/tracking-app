import { NextResponse } from "next/server";
import { nudgeFriend } from "@/actions/social.actions";
import type { ApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const friendId = typeof body?.friendId === "string" ? body.friendId : "";
    if (!friendId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "friendId zorunlu", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const result = await nudgeFriend(friendId);
    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
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
