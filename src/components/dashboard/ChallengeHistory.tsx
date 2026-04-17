"use client";

import React from "react";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import type { ChallengeEntry } from "@/actions/challenge.actions";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut" as const },
  },
};

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-zinc-950/90 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#D6FF00]/30 bg-[#D6FF00]/10 shadow-[0_0_24px_rgba(214,255,0,0.12)]">
            <Trophy className="size-5 text-[#D6FF00]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-black uppercase tracking-tight text-white sm:text-lg">
              {t("completedTab")}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tabular-nums">
              <span className="inline-flex items-center gap-1 text-[#D6FF00]">
                <Crown className="size-3.5 shrink-0" aria-hidden />
                {wins}W
              </span>
              <span className="text-white/15" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Minus className="size-3.5 shrink-0 text-red-400/90" aria-hidden />
                {losses}L
              </span>
              <span className="text-white/15" aria-hidden>
                |
              </span>
              <span className="text-zinc-500">{draws}D</span>
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="border border-white/10 bg-black/60 tabular-nums text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.12)]"
        >
          {challenges.length}
        </Badge>
      </div>

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2"
      >
        {challenges.map((c) => (
          <motion.div key={c.id} variants={itemVariants} layout>
            <ChallengeCard challenge={c} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
