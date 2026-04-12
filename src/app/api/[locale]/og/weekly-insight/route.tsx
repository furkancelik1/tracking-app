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

// ─── Font Cache (Bold 700, karakter alt kümesi) ─────────────────────────────

let _fontCache: ArrayBuffer | null = null;

// ASCII yazdırılabilir + Türkçe özel karakterler — küçültülmüş font (~8 KB)
const FONT_CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" +
  "abcdefghijklmnopqrstuvwxyz{|}~" +
  "ÇçĞğİıÖöŞşÜü·—–…\u201C\u201D\u2018\u2019«»";

async function loadInterFont(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;

  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@700&text=${encodeURIComponent(FONT_CHARS)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    }
  ).then((r) => r.text());

  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
  if (!match?.[1]) throw new Error("Could not extract Inter font URL");

  _fontCache = await fetch(match[1]).then((r) => r.arrayBuffer());
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
          background: "#0f0a2e",
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
          <span style={{ fontSize: 28 }}>🧠</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#e0e7ff" }}>
            Gönen Tracking App
          </span>
        </div>
        <span style={{ fontSize: 20, color: "#818cf8" }}>
          {isTr ? "AI Haftalık Koç Raporu" : "AI Weekly Coach Report"}
        </span>
        <span
          style={{ fontSize: 13, color: "rgba(165,180,252,0.5)", marginTop: "20px" }}
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

// ─── Avatar / Harici Görsel Ön-yükleme ───────────────────────────────────────
// Satori render sırasında dışarıya HTTP isteği atmasın diye
// harici görselleri (avatar vb.) önceden ArrayBuffer olarak çekiyoruz.

async function prefetchImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
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

  try {
    // ── Font yükleme ──
    const fontData = await loadInterFont();
    const tFont = performance.now();

    // ── Parametre & güvenlik kontrolü ──
    const id = request.nextUrl.searchParams.get("id");
    if (!id || typeof id !== "string" || id.length > 50) {
      return buildFallbackImage(isTr, fontData);
    }

    // ── DB Fetch ──
    const insight = await prisma.weeklyInsight.findUnique({
      where: { id },
      include: { user: { select: { xp: true, name: true, image: true } } },
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

    // ── Paralel: İstatistikler + Avatar ön-yükleme ──
    const weekAgo = subDays(startOfDay(insight.createdAt), 6);
    const [dailyRoutineCount, logCount, longestStreakRoutine, avatarSrc] =
      await Promise.all([
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
        prefetchImage(insight.user.image),
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
    const highlightLabel = isTr ? "Haftanın Başarısı" : "Achievement of the Week";
    const successHighlight = insight.successHighlight ?? null;
    const weekLabel = insight.weekKey.replace("-W", " · W");
    const brandName = "Gönen Tracking App";

    // ── Image Response ──
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
            "radial-gradient(ellipse at 30% 20%, #1e1565 0%, #0f0a2e 70%)",
          fontFamily: "Inter, sans-serif",
          color: "white",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#7c3aed",
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

          {/* Rank badge + Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {avatarSrc && (
              <img
                src={avatarSrc}
                width={36}
                height={36}
                style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }}
              />
            )}
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
          }}
        >
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
            &ldquo;{quote}&rdquo;
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

        {/* ── Success Highlight Badge ── */}
        {successHighlight && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0 0 8px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                borderRadius: "9999px",
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <span style={{ fontSize: 18 }}>🏆</span>
              <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>
                {highlightLabel}:
              </span>
              <span style={{ fontSize: 14, color: "#6ee7b7", fontWeight: 700 }}>
                {successHighlight}
              </span>
            </div>
          </div>
        )}

        {/* ── Alt kısım: İki sütunlu istatistikler ── */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "flex-end",
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
                  background: "#7c3aed",
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
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
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
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(165,180,252,0.4)" }}>
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

    // ── Server-Timing (tarayıcı DevTools → Network → Timing) ──
    const serverTiming = [
      `font_load;desc="Font Load";dur=${(tFont - t0).toFixed(1)}`,
      `db_fetch;desc="DB Fetch";dur=${(tDb - tFont).toFixed(1)}`,
      `image_render;desc="Image Render";dur=${(tImg - tDb).toFixed(1)}`,
      `total;desc="Total";dur=${(tImg - t0).toFixed(1)}`,
    ].join(", ");

    console.table({
      "font_load (ms)": +(tFont - t0).toFixed(1),
      "db_fetch (ms)": +(tDb - tFont).toFixed(1),
      "image_render (ms)": +(tImg - tDb).toFixed(1),
      "total (ms)": +(tImg - t0).toFixed(1),
    });

    // ── Response with headers ──
    const headers = new Headers(imgResponse.headers);
    headers.set("Server-Timing", serverTiming);

    if (isTest) {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    } else {
      headers.set(
        "Cache-Control",
        "public, max-age=604800, s-maxage=604800, immutable"
      );
    }

    return new Response(imgResponse.body, { status: 200, headers });
  } catch (error) {
    // ── Hata Yönetimi ──
    console.error("[OG] Image generation failed:", error);

    // 1. Önce dinamik fallback dene (font cache varsa hızlı)
    try {
      const fontData = _fontCache ?? (await loadInterFont());
      return buildFallbackImage(isTr, fontData);
    } catch {
      // 2. Hiçbir şey çalışmıyorsa → statik görsele 302 redirect
      return new Response(null, {
        status: 302,
        headers: { Location: "/images/fallback-og.png" },
      });
    }
  }
}
