import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    console.error("[OG weekly-insight] Missing 'id' query param. URL:", req.nextUrl.toString());
    return new Response("Missing id", { status: 400 });
  }

  let insight: {
    summary: string;
    weekKey: string;
    successHighlight: string | null;
    challengeTitle: string | null;
    challengeCompleted: boolean;
    user: { name: string | null };
  } | null = null;

  try {
    insight = await prisma.weeklyInsight.findUnique({
      where: { id },
      select: {
        summary: true,
        weekKey: true,
        successHighlight: true,
        challengeTitle: true,
        challengeCompleted: true,
        user: { select: { name: true } },
      },
    });
  } catch (err: any) {
    console.error("[OG weekly-insight] DB error:", err?.message);
    return new Response("Internal error", { status: 500 });
  }

  if (!insight) {
    console.warn(`[OG weekly-insight] Insight not found for id: ${id}. URL: ${req.nextUrl.toString()}`);
    return new Response("Not found", { status: 404 });
  }

  const userName = insight.user.name ?? "User";
  const weekLabel = insight.weekKey; // e.g. "2026-W15"
  const highlight = insight.successHighlight ?? "";
  const challengeLabel = insight.challengeTitle ?? "";
  const summaryPreview =
    insight.summary.length > 140
      ? insight.summary.slice(0, 140) + "…"
      : insight.summary;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #1e1b4b 0%, #312e81 35%, #4c1d95 70%, #1e1b4b 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "48px 56px",
        }}
      >
        {/* Top: Brand + Week */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
              }}
            />
            <span style={{ fontSize: 22, fontWeight: 600, color: "#c7d2fe" }}>
              Routine Tracker
            </span>
          </div>
          <span
            style={{
              fontSize: 18,
              color: "#a5b4fc",
              background: "rgba(99,102,241,0.2)",
              padding: "6px 16px",
              borderRadius: "999px",
            }}
          >
            {weekLabel}
          </span>
        </div>

        {/* Middle: Summary */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 16, color: "#a5b4fc", fontWeight: 500 }}>
            {userName}&apos;s AI Coach Insight
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.35,
              color: "#e0e7ff",
              maxWidth: "90%",
            }}
          >
            {summaryPreview}
          </div>
        </div>

        {/* Bottom: Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {highlight && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fbbf24",
                background: "rgba(251,191,36,0.15)",
                padding: "6px 14px",
                borderRadius: "8px",
              }}
            >
              ⭐ {highlight}
            </span>
          )}
          {challengeLabel && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#34d399",
                background: "rgba(52,211,153,0.15)",
                padding: "6px 14px",
                borderRadius: "8px",
              }}
            >
              🎯 {challengeLabel}
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
