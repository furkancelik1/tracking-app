"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { calculateLevel } from "@/lib/level";
import { Shield, Sparkles } from "lucide-react";

type Props = {
  xp: number;
  className?: string;
};

export function LevelProgressBar({ xp, className }: Props) {
  const t = useTranslations("levels");
  const { level, currentLevelXp, xpForNextLevel, xpToNextLevel, rank, rankColor, progress } =
    calculateLevel(xp);
  const localizedRank = t(`ranks.${rank}` as Parameters<typeof t>[0]);

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      {/* Üst bilgi satırı */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-8 rounded-lg"
            style={{ backgroundColor: rankColor + "18" }}
          >
            <Shield className="size-4" style={{ color: rankColor }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold" style={{ color: rankColor }}>
              Level {level}
            </span>
            <span className="text-xs text-muted-foreground">• {localizedRank}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3 text-indigo-400" />
          <span className="tabular-nums">{t("progressRemaining", { count: xpToNextLevel })}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 16, mass: 0.9 }}
        />
        {/* Shimmer efekti */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, white 50%, transparent)`,
            width: "30%",
          }}
          animate={{ x: ["-100%", "400%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
        />
      </div>

      {/* XP sayacı — barın hemen altında */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] tabular-nums font-semibold" style={{ color: rankColor }}>
          {currentLevelXp}
          <span className="font-normal text-muted-foreground"> / {xpForNextLevel} XP</span>
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground/60">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
