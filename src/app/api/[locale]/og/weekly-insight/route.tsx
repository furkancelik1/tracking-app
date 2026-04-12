import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/level";
import { subDays, startOfDay } from "date-fns";

export const runtime = "nodejs";

// ─── Rank Helpers ────────────────────────────────────────────────────────────

const RANK_EMOJI: Record<string, string> = {
  Çırak: "🌱",
  Disiplinli: "💎",
  "Rutin Canavarı": "🐉",
  Üstat: "⭐",
  Efsane: "🔥",
};

const RANK_EN: Record<string, string> = {
  Çırak: "Apprentice",
  Disiplinli: "Disciplined",
  "Rutin Canavarı": "Routine Beast",
  Üstat: "Master",
  Efsane: "Legend",
};

// ─── Font Cache ──────────────────────────────────────────────────────────────

let _fontCache: ArrayBuffer | null = null;

async function loadInterFont(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;

  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;700",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    }
  ).then((res) => res.text());

  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
  if (!match?.[1]) throw new Error("Could not extract Inter font URL");

  _fontCache = await fetch(match[1]).then((res) => res.arrayBuffer());
  return _fontCache;
}

// ─── Fallback Branding Image ─────────────────────────────────────────────────

function buildFallbackImage(isTr: boolean, fontData: ArrayBuffer) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #0f0a2e 0%, #1e1565 35%, #312e81 65%, #1e1b4b 100%)",
          fontFamily: "Inter, sans-serif",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            🧠
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#e0e7ff" }}>
            Gönen Tracking App
          </span>
        </div>
        <span style={{ fontSize: 20, color: "#818cf8" }}>
          {isTr
            ? "AI Haftalık Koç Raporu"
            : "AI Weekly Coach Report"}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "rgba(165,180,252,0.5)",
            marginTop: "20px",
          }}
        >
          furkancelik.online
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: fontData, style: "normal" as const, weight: 700 as const }],
    }
  );
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const t0 = performance.now();
  const { locale } = await params;
  const isTr = locale === "tr";
  const isTest = request.nextUrl.searchParams.get("test") === "true";

  // ── Font yükleme ──
  const fontData = await loadInterFont();
  const tFont = performance.now();

  // ── Parametre & güvenlik kontrolü ──
  const id = request.nextUrl.searchParams.get("id");
  if (!id || typeof id !== "string" || id.length > 50) {
    return buildFallbackImage(isTr, fontData);
  }

  // ── DB Fetch (checkpoint: dbFetch) ──
  const insight = await prisma.weeklyInsight.findUnique({
    where: { id },
    include: { user: { select: { xp: true, name: true } } },
  });

  if (!insight) {
    return buildFallbackImage(isTr, fontData);
  }

  // ── Level & Rank ──
  const levelInfo = calculateLevel(insight.user.xp);
  const rankLabel = isTr
    ? levelInfo.rank
    : (RANK_EN[levelInfo.rank] ?? levelInfo.rank);
  const rankEmoji = RANK_EMOJI[levelInfo.rank] ?? "🌱";

  // ── Haftalık tamamlanma oranı + Longest Streak ──
  const weekAgo = subDays(startOfDay(insight.createdAt), 6);
  const [dailyRoutineCount, logCount, longestStreakRoutine] = await Promise.all([
    prisma.routine.count({
      where: { userId: insight.userId, isActive: true, frequency: "DAILY" },
    }),
    prisma.routineLog.count({
      where: { userId: insight.userId, completedAt: { gte: weekAgo } },
    }),
    prisma.routine.findFirst({
      where: { userId: insight.userId, isActive: true },
      orderBy: { longestStreak: "desc" },
      select: { longestStreak: true },
    }),
  ]);
  const possible = dailyRoutineCount * 7;
  const completionRate =
    possible > 0 ? Math.min(100, Math.round((logCount / possible) * 100)) : 0;
  const longestStreak = longestStreakRoutine?.longestStreak ?? 0;

  const tDb = performance.now();

  // ── En vurucu cümle ──
  const sentences = insight.summary
    .split(/[.!?]\s+/)
    .filter((s) => s.trim().length > 20);
  const quote =
    sentences.length > 0
      ? sentences[0].length > 140
        ? sentences[0].slice(0, 137) + "…"
        : sentences[0] + "."
      : insight.summary.slice(0, 140);

  // ── Lokalize metinler ──
  const disciplineText = isTr
    ? `Bu hafta %${completionRate} disiplin sağlandı`
    : `Achieved ${completionRate}% discipline this week`;
  const streakText = isTr
    ? `${longestStreak} Günlük Seri`
    : `${longestStreak} Day Streak`;
  const weekLabel = insight.weekKey.replace("-W", " · W");
  const brandName = "Gönen Tracking App";

  // ── Image Response (checkpoint: imgRender) ──
  const imgResponse = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          background:
            "linear-gradient(145deg, #0f0a2e 0%, #1e1565 35%, #312e81 65%, #1e1b4b 100%)",
          fontFamily: "Inter, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Glow efektleri ── */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-60px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)",
          }}
        />
        {/* Amber glow — sağ alt streak bölgesi */}
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            right: "20px",
            width: "300px",
            height: "250px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          }}
        />

        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              🧠
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ff" }}>
                {brandName}
              </span>
              <span
                style={{ fontSize: 13, color: "#818cf8", marginTop: "2px" }}
              >
                {weekLabel}
              </span>
            </div>
          </div>

          {/* Rank badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span style={{ fontSize: 20 }}>{rankEmoji}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: levelInfo.rankColor,
              }}
            >
              {rankLabel}
            </span>
            <span style={{ fontSize: 13, color: "#a5b4fc" }}>
              Lv.{levelInfo.level}
            </span>
          </div>
        </div>

        {/* ── Merkez: Insight quote ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "20px 0",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 64,
              color: "rgba(139,92,246,0.3)",
              lineHeight: 1,
              marginBottom: "-8px",
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: "920px",
              color: "#f1f5f9",
              margin: 0,
            }}
          >
            {quote}
          </p>
          <span
            style={{
              fontSize: 13,
              color: "#818cf8",
              marginTop: "12px",
            }}
          >
            — AI Weekly Coach
          </span>
        </div>

        {/* ── Alt kısım: İki sütunlu istatistikler ── */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "flex-end",
            position: "relative",
          }}
        >
          {/* Sol: Progress Bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: 15, color: "#c7d2fe" }}>
                {disciplineText}
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#a78bfa",
                }}
              >
                {completionRate}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${completionRate}%`,
                  height: "100%",
                  borderRadius: "6px",
                  background:
                    "linear-gradient(90deg, #8b5cf6, #6366f1, #818cf8)",
                }}
              />
            </div>
          </div>

          {/* Sağ: Longest Streak */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.06) 100%)",
              border: "1px solid rgba(245,158,11,0.25)",
              position: "relative",
              minWidth: "200px",
            }}
          >
            {/* Amber glow */}
            <div
              style={{
                position: "absolute",
                inset: "-12px",
                borderRadius: "28px",
                background:
                  "radial-gradient(ellipse, rgba(245,158,11,0.15) 0%, transparent 70%)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 32 }}>🔥</span>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#fbbf24",
                  lineHeight: 1,
                }}
              >
                {longestStreak}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "#fcd34d",
                marginTop: "4px",
                position: "relative",
              }}
            >
              {streakText}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "8px",
            position: "relative",
          }}
        >
          <span
            style={{ fontSize: 12, color: "rgba(165,180,252,0.5)" }}
          >
            furkancelik.online
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );

  const tImg = performance.now();

  // ── Performance Metrics ──
  const timings = {
    "font (ms)": +(tFont - t0).toFixed(1),
    "dbFetch (ms)": +(tDb - tFont).toFixed(1),
    "imgRender (ms)": +(tImg - tDb).toFixed(1),
    "total (ms)": +(tImg - t0).toFixed(1),
  };

  // Dev + prod: terminale yazdır
  console.table(timings);

  // ── Server-Timing header ──
  const serverTiming = [
    `font;desc="Font Load";dur=${(tFont - t0).toFixed(1)}`,
    `db;desc="DB Fetch";dur=${(tDb - tFont).toFixed(1)}`,
    `img;desc="Image Render";dur=${(tImg - tDb).toFixed(1)}`,
    `total;desc="Total";dur=${(tImg - t0).toFixed(1)}`,
  ].join(", ");

  // ── Response with headers ──
  const headers = new Headers(imgResponse.headers);
  headers.set("Server-Timing", serverTiming);

  if (isTest) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  } else {
    headers.set("Cache-Control", "public, max-age=604800, s-maxage=604800, immutable");
  }

  return new Response(imgResponse.body, {
    status: 200,
    headers,
  });
}
