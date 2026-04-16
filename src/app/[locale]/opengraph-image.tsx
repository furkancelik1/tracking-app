import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Zenith";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const title = isTr ? "Zenith — Disiplinini zirveye taşı" : "Zenith — Master Your Discipline";
  const subtitle = isTr
    ? "Alışkanlıklarını takip et, serilerini koru, seviye atla."
    : "Track habits, build streaks, level up.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.1,
            marginBottom: 20,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, opacity: 0.88, maxWidth: 820, lineHeight: 1.35 }}>
          {subtitle}
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 20,
            fontWeight: 600,
            color: "#a5b4fc",
          }}
        >
          furkancelik.online
        </div>
      </div>
    ),
    { ...size }
  );
}
