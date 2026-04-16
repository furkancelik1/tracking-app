"use client";

import {from "react";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { calculateLevel } from "@/lib/level";
import { Shield } from "lucide-react";

type Props = {
  xp: number;
  /** Sadece seviye numarası göster (compact) */
  compact?: boolean;
  className?: string;
};

export function LevelBadge({ xp, compact = false, className }: Props) {
  const t = useTranslations("levels");
  const { level, rank, rankColor } = calculateLevel(xp);
  const localizedRank = t(`ranks.${rank}` as Parameters<typeof t>[0]);

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          className
        )}
        style={{ backgroundColor: rankColor + "20", color: rankColor }}
      >
        <Shield className="size-2.5" />
        {level}
      </span>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1", className)}
      style={{ backgroundColor: rankColor + "15", color: rankColor }}
    >
      <Shield className="size-3.5" />
      <span className="text-xs font-bold tabular-nums">Lvl {level}</span>
      <span className="text-[10px] font-medium opacity-80">• {localizedRank}</span>
    </div>
  );
}
