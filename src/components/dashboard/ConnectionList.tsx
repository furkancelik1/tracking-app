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
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { unfollowAction, type FriendEntry } from "@/actions/social.actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Animation variants ─────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  following: FriendEntry[];
};

export function ConnectionList({ following: initialFollowing }: Props) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  const handleUnfollow = (targetId: string) => {
    startTransition(async () => {
      await unfollowAction(targetId);
      setFollowing((prev) => prev.filter((f) => f.id !== targetId));
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <UserCheck className="size-4 text-indigo-400" />
          </div>
          {t("followingTab")}
          <Badge variant="secondary" className="ml-auto tabular-nums">
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
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Users className="size-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">{t("noFollowing")}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              {t("noFriendsDesc")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-1.5"
          >
            <AnimatePresence mode="popLayout">
              {following.map((user) => (
                <motion.div
                  key={user.id}
                  variants={item}
                  exit="exit"
                  layout
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-accent/50 transition-colors group border border-transparent hover:border-border/50"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="size-10 ring-2 ring-background shadow-sm">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {user.currentStreak >= 7 && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-orange-500 p-0.5">
                        <Flame className="size-2.5 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        {user.name ?? tc("anonymous")}
                      </p>
                      {user.subscriptionTier === "PRO" && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[9px] px-1 py-0 gap-0.5 shrink-0">
                          <Sparkles className="size-2" /> PRO
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="size-3 text-indigo-400" />
                        {formatXp(user.xp)} XP
                      </span>
                      {user.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <Flame className="size-3" />
                          {tc("dayStreak", { count: user.currentStreak })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Level + Unfollow */}
                  <LevelBadge xp={user.xp} compact />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnfollow(user.id)}
                    disabled={isPending}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all gap-1"
                  >
                    <UserMinus className="size-3.5" />
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
