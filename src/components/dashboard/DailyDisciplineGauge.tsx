"use client";

import { useState, useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

type Props = {
  score: number;
  completed: number;
  total: number;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}


const NEON_GREEN = "#39FF14";

export function DailyDisciplineGauge({ score, completed, total }: Props) {
  const t = useTranslations("gauge");
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => setIsMounted(true), []);

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

  const data = [{ name: "score", value: score, fill: NEON_GREEN }];
  const isHot = score >= 80;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        className={`relative border-zinc-800/50 bg-card/70 backdrop-blur-sm overflow-hidden transition-all duration-500 ${
          isHot ? "shadow-[0_0_40px_rgba(57,255,20,0.18)] border-[rgba(57,255,20,0.2)]" : "hover:border-zinc-700/70"
        }`}
      >

        <CardContent className="relative py-4">
          <div className="relative mx-auto min-w-0 overflow-hidden" style={{ width: "200px", height: "200px", minHeight: "200px", position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
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
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="3"
                      result="blur"
                    />
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

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-4xl md:text-5xl font-black tabular-nums"
                style={{
                  color: NEON_GREEN,
                  textShadow: `0 0 12px ${NEON_GREEN}70, 0 0 40px ${NEON_GREEN}30`,
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
