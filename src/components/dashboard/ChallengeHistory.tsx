"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import type { ChallengeEntry } from "@/actions/challenge.actions";

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  challenges: ChallengeEntry[];
};

export function ChallengeHistory({ challenges }: Props) {
  const t = useTranslations("challenges");

  const wins = challenges.filter(
    (c) =>
      (c.isChallenger && c.challengerCount > c.opponentCount) ||
      (!c.isChallenger && c.opponentCount > c.challengerCount)
  ).length;

  const losses = challenges.filter(
    (c) =>
      (c.isChallenger && c.challengerCount < c.opponentCount) ||
      (!c.isChallenger && c.opponentCount < c.challengerCount)
  ).length;

  const draws = challenges.filter((c) => c.winnerId === null).length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center">
            <Trophy className="size-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("completedTab")}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Crown className="size-3 text-amber-400" /> {wins}W
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span className="flex items-center gap-0.5">
                <Minus className="size-3 text-red-400" /> {losses}L
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span>{draws}D</span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {challenges.length}
        </Badge>
      </div>

      {/* Completed challenge cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {challenges.map((c) => (
          <ChallengeCard key={c.id} challenge={c} />
        ))}
      </motion.div>
    </div>
  );
}
