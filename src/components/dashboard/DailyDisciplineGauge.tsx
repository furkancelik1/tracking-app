"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

type Props = {
  score: number;
  completed: number;
  total: number;
};

const NEON_GREEN = "#39FF14";
const DEFAULT_GLOW = `${NEON_GREEN}30`;

function readThemeColor(prop: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  return v || fallback;
}

function DailyDisciplineGaugeImpl({ score }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [ringColor, setRingColor] = useState(NEON_GREEN);
  const [glowColor, setGlowColor] = useState(DEFAULT_GLOW);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setRingColor(readThemeColor("--shop-primary", NEON_GREEN));
    setGlowColor(readThemeColor("--shop-primary-glow", DEFAULT_GLOW));

    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onMobileChange);

    let pending: number | null = null;
    const onThemeChanged = () => {
      if (pending !== null) window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        setRingColor(readThemeColor("--shop-primary", NEON_GREEN));
        setGlowColor(readThemeColor("--shop-primary-glow", DEFAULT_GLOW));
        pending = null;
      }, 80);
    };
    window.addEventListener("theme-changed", onThemeChanged);
    return () => {
      window.removeEventListener("theme-changed", onThemeChanged);
      mql.removeEventListener("change", onMobileChange);
      if (pending !== null) window.clearTimeout(pending);
    };
  }, []);

  const data = useMemo(
    () => [{ name: "score", value: score, fill: ringColor }],
    [score, ringColor]
  );
  const isHot = score >= 80;

  if (!isMounted) {
    return (
      <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="mx-auto w-[200px] h-[200px] flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        className="relative border-zinc-800/50 bg-card/70 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-zinc-700/70"
        style={
          isHot
            ? {
                boxShadow: `0 0 40px ${glowColor}, 0 0 0 1px ${ringColor}30`,
                borderColor: `${ringColor}30`,
              }
            : undefined
        }
      >
        <CardContent className="relative py-4">
          <div
            className="relative mx-auto min-w-0 overflow-hidden"
            style={{
              width: "200px",
              height: "200px",
              minHeight: "200px",
              position: "relative",
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={100}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="78%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                data={data}
                barSize={12}
              >
                <defs>
                  <filter id="neonGaugeGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: "hsl(var(--border) / 0.3)" }}
                  isAnimationActive={!isMobile}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  style={{ filter: "url(#neonGaugeGlow)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-4xl md:text-5xl font-black tabular-nums"
                style={{
                  color: ringColor,
                  textShadow: `0 0 12px ${ringColor}90, 0 0 40px ${glowColor}`,
                }}
              >
                {score}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export const DailyDisciplineGauge = memo(DailyDisciplineGaugeImpl);
