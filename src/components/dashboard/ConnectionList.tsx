"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  UserMinus,
  Flame,
  Sparkles,
  Users,
  TrendingUp,
  Swords,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { unfollowAction, type FriendEntry } from "@/actions/social.actions";
import { ChallengeInviteDialog } from "@/components/dashboard/ChallengeInviteDialog";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

const proBadgeClass =
  "border border-[#D6FF00]/35 bg-[#D6FF00]/12 text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.08)]";

type Props = {
  following: FriendEntry[];
  /** Mutual friends eligible for challenges (from getFriendsAction) */
  friends?: FriendEntry[];
};

export function ConnectionList({ following: initialFollowing, friends = [] }: Props) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  /** Set of friend IDs eligible for challenges (mutual follow or accepted friendship) */
  const friendIds = new Set(friends.map((f) => f.id));

  const handleUnfollow = (targetId: string) => {
    startTransition(async () => {
      await unfollowAction(targetId);
      setFollowing((prev) => prev.filter((f) => f.id !== targetId));
    });
  };

  return (
    <Card className="overflow-hidden border border-white/5 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base font-black uppercase tracking-tight text-white">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#D6FF00]/30 bg-[#D6FF00]/10 shadow-[0_0_20px_rgba(214,255,0,0.1)]">
            <UserCheck className="size-4 text-[#D6FF00]" aria-hidden />
          </div>
          {t("followingTab")}
          <Badge
            variant="secondary"
            className="ml-auto border border-white/10 bg-black/60 tabular-nums text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.12)]"
          >
            {following.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {following.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-zinc-900">
              <Users className="size-7 text-[#D6FF00]/35" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-white">{t("noFollowing")}</p>
            <p className="mt-1 max-w-[240px] text-xs text-zinc-500">{t("noFriendsDesc")}</p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            <AnimatePresence mode="popLayout">
              {following.map((user) => (
                <motion.div
                  key={user.id}
                  variants={item}
                  exit="exit"
                  layout
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-black/25 px-3 py-3 transition-colors hover:border-[#D6FF00]/20 hover:bg-white/[0.03]"
                >
                  <div className="relative">
                    <Avatar className="size-10 shadow-sm ring-2 ring-black">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-zinc-800 to-zinc-950 text-xs font-semibold text-[#D6FF00]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {user.currentStreak >= 7 && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-black bg-[#D6FF00] p-0.5">
                        <Flame className="size-2.5 text-black" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-white">
                        {user.name ?? tc("anonymous")}
                      </p>
                      {user.subscriptionTier === "PRO" && (
                        <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1 py-0 text-[9px]`}>
                          <Sparkles className="size-2" aria-hidden />
                          PRO
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1 font-medium text-zinc-400">
                        <TrendingUp className="size-3 text-[#D6FF00]" aria-hidden />
                        {formatXp(user.xp)} XP
                      </span>
                      {user.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 font-medium text-[#D6FF00]">
                          <Flame className="size-3" aria-hidden />
                          {tc("dayStreak", { count: user.currentStreak })}
                        </span>
                      )}
                    </div>
                  </div>

                  <LevelBadge xp={user.xp} compact />

                  {/* Challenge button — only shown for mutual friends */}
                  {friendIds.has(user.id) && (
                    <ChallengeInviteDialog
                      friends={friends}
                      preselectedFriendId={user.id}
                      preselectedFriendName={user.name}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 border-white/15 px-2 text-xs text-zinc-300 touch-manipulation hover:border-[#D6FF00]/40 hover:bg-[#D6FF00]/10 hover:text-[#D6FF00]"
                          title={t("challenge")}
                        >
                          <Swords className="size-3.5" aria-hidden />
                          <span className="hidden sm:inline">{t("challenge")}</span>
                        </Button>
                      }
                    />
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnfollow(user.id)}
                    disabled={isPending}
                    className="h-8 gap-1 px-2 text-xs text-zinc-500 opacity-60 transition-all hover:text-white group-hover:opacity-100 touch-manipulation"
                  >
                    <UserMinus className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">{t("unfollow")}</span>
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
