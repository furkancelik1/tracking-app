"use client";

import React, { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Clock,
  X,
  Flame,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import {
  acceptFollowAction,
  rejectFollowAction,
  unfollowAction,
  type FriendEntry,
  type FriendRequest,
} from "@/actions/social.actions";

type Tab = "followers" | "following" | "requests";

type Props = {
  followers: FriendEntry[];
  following: FriendEntry[];
  pendingRequests: FriendRequest[];
};

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

const proBadgeClass =
  "border border-[#D6FF00]/35 bg-[#D6FF00]/12 text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.08)]";

function UserRow({
  user,
  actions,
}: {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    xp: number;
    currentStreak: number;
    subscriptionTier: string;
  };
  actions?: React.ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-white/5 hover:bg-white/[0.03]">
      <Avatar className="size-9 ring-1 ring-white/10">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{user.name ?? tc("anonymous")}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{formatXp(user.xp)} XP</span>
          {user.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 font-medium text-[#D6FF00]">
              <Flame className="size-3" aria-hidden /> {user.currentStreak}
            </span>
          )}
        </div>
      </div>
      {user.subscriptionTier === "PRO" && (
        <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1.5 py-0 text-[10px]`}>
          <Sparkles className="size-2.5" aria-hidden />
          PRO
        </Badge>
      )}
      <LevelBadge xp={user.xp} compact />
      {actions}
    </div>
  );
}

export function SocialTabs({
  followers: initFollowers,
  following: initFollowing,
  pendingRequests: initRequests,
}: Props) {
  const t = useTranslations("social");
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<Tab>("followers");
  const [followers, setFollowers] = useState(initFollowers);
  const [following, setFollowing] = useState(initFollowing);
  const [requests, setRequests] = useState(initRequests);

  const handleAccept = (friendshipId: string) => {
    startTransition(async () => {
      await acceptFollowAction(friendshipId);
      const accepted = requests.find((r) => r.id === friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
      if (accepted) {
        setFollowers((prev) => [
          {
            id: accepted.user.id,
            friendshipId: accepted.id,
            name: accepted.user.name,
            image: accepted.user.image,
            xp: 0,
            currentStreak: 0,
            subscriptionTier: "FREE",
          },
          ...prev,
        ]);
      }
    });
  };

  const handleReject = (friendshipId: string) => {
    startTransition(async () => {
      await rejectFollowAction(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    });
  };

  const handleUnfollow = (targetId: string) => {
    startTransition(async () => {
      await unfollowAction(targetId);
      setFollowing((prev) => prev.filter((f) => f.id !== targetId));
      setFollowers((prev) => prev.filter((f) => f.id !== targetId));
    });
  };

  const tabs: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: "followers", label: t("followers"), icon: Users, count: followers.length },
    { key: "following", label: t("followingTab"), icon: UserCheck, count: following.length },
    { key: "requests", label: t("pendingRequests"), icon: Clock, count: requests.length },
  ];

  return (
    <Card className="overflow-hidden border border-white/5 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <CardHeader className="space-y-0 p-0 sm:p-6 sm:pb-0">
        <div className="flex gap-0.5 rounded-none border-b border-white/5 bg-black/40 p-1 sm:gap-1 sm:rounded-xl sm:border sm:border-white/5 sm:border-b-0">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors touch-manipulation sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-sm",
                tab === key
                  ? "bg-[#D6FF00] text-black shadow-[0_0_24px_rgba(214,255,0,0.2)]"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <Badge
                  className={cn(
                    "ml-0.5 h-5 px-1.5 text-[10px] tabular-nums",
                    tab === key
                      ? "border border-black/20 bg-black/15 text-black"
                      : "border border-white/10 bg-zinc-900 text-zinc-300"
                  )}
                >
                  {count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 sm:p-6 sm:pt-4">
        {tab === "followers" && (
          <div>
            {followers.length === 0 ? (
              <EmptyState icon={Users} text={t("noFollowers")} />
            ) : (
              <div className="space-y-1">
                {followers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    actions={
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnfollow(user.id)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 touch-manipulation"
                      >
                        <X className="size-3.5" aria-hidden />
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "following" && (
          <div>
            {following.length === 0 ? (
              <EmptyState icon={UserCheck} text={t("noFollowing")} />
            ) : (
              <div className="space-y-1">
                {following.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    actions={
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnfollow(user.id)}
                        disabled={isPending}
                        className="h-8 px-2 text-xs text-zinc-500 hover:text-red-400 touch-manipulation"
                      >
                        {t("unfollow")}
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div>
            {requests.length === 0 ? (
              <EmptyState icon={Clock} text={t("noRequests")} />
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 rounded-xl border border-[#D6FF00]/20 bg-zinc-900/60 px-3 py-2.5"
                  >
                    <Avatar className="size-9 ring-1 ring-white/10">
                      <AvatarImage src={req.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">{getInitials(req.user.name)}</AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {req.user.name ?? "?"}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req.id)}
                        disabled={isPending}
                        className="h-8 gap-1 bg-[#D6FF00] text-black hover:bg-[#c8f000]"
                      >
                        <UserCheck className="size-3.5" aria-hidden />
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(req.id)}
                        disabled={isPending}
                        className="h-8 text-zinc-500 hover:text-white"
                      >
                        <X className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="py-10 text-center">
      <Icon className="mx-auto mb-3 size-10 text-[#D6FF00]/25" aria-hidden />
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}
