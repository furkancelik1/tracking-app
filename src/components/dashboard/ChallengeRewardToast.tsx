"use client";

import { useEffect } from "react";
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

    // Her ödül için stagger toast göster
    rewards.forEach((reward, index) => {
      const delay = index * 1200;

      setTimeout(() => {
        const icon =
          reward.outcome === "win" ? <Trophy className="h-5 w-5 text-yellow-400" /> :
          reward.outcome === "draw" ? <Swords className="h-5 w-5 text-blue-400" /> :
          <ShieldAlert className="h-5 w-5 text-gray-400" />;

        const messageKey =
          reward.outcome === "win" ? "rewardWin" :
          reward.outcome === "draw" ? "rewardDraw" :
          "rewardLoss";

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
