import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Routine Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isTr = locale === "tr";

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
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Logo circle + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "white",
            }}
          />
          <span style={{ fontSize: 28, fontWeight: 600, color: "#c7d2fe" }}>
            Routine Tracker
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {isTr
            ? "Alışkanlıklarını Takip Et, Hayatını Dönüştür"
            : "Track Your Habits, Transform Your Life"}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#c7d2fe",
            marginTop: "24px",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          {isTr
            ? "Seriler, grafikler ve analizlerle motivasyonunu koru"
            : "Stay motivated with streaks, charts, and analytics"}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: 16,
            color: "#a5b4fc",
          }}
        >
          <span>furkancelik.online</span>
          <span style={{ color: "#6366f1" }}>|</span>
          <span>{isTr ? "Ücretsiz Başla" : "Start for Free"}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
