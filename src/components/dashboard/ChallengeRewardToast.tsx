"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Trophy, Swords, ShieldAlert } from "lucide-react";
import type { ChallengeRewardResult } from "@/actions/challenge.actions";

interface ChallengeRewardToastProps {
  rewards: ChallengeRewardResult[];
}

export default function ChallengeRewardToast({ rewards }: ChallengeRewardToastProps) {
  const t = useTranslations("challenges");

  useEffect(() => {
    if (!rewards.length) return;

    rewards.forEach((reward, index) => {
      const delay = index * 1200;

      setTimeout(() => {
        const icon =
          reward.outcome === "win" ? (
            <Trophy className="h-5 w-5 text-[#D6FF00]" aria-hidden />
          ) : reward.outcome === "draw" ? (
            <Swords className="h-5 w-5 text-zinc-400" aria-hidden />
          ) : (
            <ShieldAlert className="h-5 w-5 text-zinc-500" aria-hidden />
          );

        const messageKey =
          reward.outcome === "win"
            ? "rewardWin"
            : reward.outcome === "draw"
              ? "rewardDraw"
              : "rewardLoss";

        toast(t("challengeRewardTitle"), {
          description: `${reward.routineTitle} — ${t(messageKey, { xp: reward.xp, coins: reward.coins })}`,
          icon,
          duration: 6000,
        });
      }, delay);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
