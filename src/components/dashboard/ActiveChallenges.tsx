"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChallengeEntry } from "@/actions/challenge.actions";
import type { FriendEntry } from "@/actions/social.actions";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import { ChallengeInviteDialog } from "@/components/dashboard/ChallengeInviteDialog";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  challenges: ChallengeEntry[];
  friends: FriendEntry[];
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ActiveChallenges({ challenges, friends }: Props) {
  const t = useTranslations("challenges");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-[#D6FF00]/10 border border-[#D6FF00]/25 flex items-center justify-center">
            <Swords className="size-4 text-[#D6FF00]" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">{t("title")}</h3>
            <p className="text-xs text-zinc-400">{t("subtitle")}</p>
          </div>
        </div>
        <ChallengeInviteDialog friends={friends} />
      </div>

      {/* Challenge Cards */}
      {challenges.length === 0 ? (
        <Card className="border-white/5 bg-zinc-950">
          <CardContent className="py-10 text-center">
            <Swords className="size-10 text-[#D6FF00]/60 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">{t("empty")}</p>
            <p className="text-xs text-zinc-400 mt-1">{t("emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
