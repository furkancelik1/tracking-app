"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChallengeEntry } from "@/actions/challenge.actions";
import type { FriendEntry } from "@/actions/social.actions";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import { ChallengeInviteDialog } from "@/components/dashboard/ChallengeInviteDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  challenges: ChallengeEntry[];
  friends: FriendEntry[];
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function ActiveChallenges({ challenges, friends }: Props) {
  const t = useTranslations("challenges");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
            <Swords className="size-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <ChallengeInviteDialog friends={friends} />
      </div>

      {/* Challenge Cards */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Swords className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">{t("empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("emptyDesc")}</p>
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
