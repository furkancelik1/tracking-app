"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  X,
  Flame,
  Sparkles,
  Swords,
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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Tab = "followers" | "following" | "requests";

type Props = {
  followers: FriendEntry[];
  following: FriendEntry[];
  pendingRequests: FriendRequest[];
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ User Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function UserRow({
  user,
  actions,
}: {
  user: { id: string; name: string | null; image: string | null; xp: number; currentStreak: number; subscriptionTier: string };
  actions?: React.ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors group">
      <Avatar className="size-9">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name ?? tc("anonymous")}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatXp(user.xp)} XP</span>
          {user.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-orange-400">
              <Flame className="size-3" /> {user.currentStreak}
            </span>
          )}
        </div>
      </div>
      {user.subscriptionTier === "PRO" && (
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
          <Sparkles className="size-2.5" /> PRO
        </Badge>
      )}
      <LevelBadge xp={user.xp} compact />
      {actions}
    </div>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SocialTabs({ followers: initFollowers, following: initFollowing, pendingRequests: initRequests }: Props) {
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
    <Card>
      {/* Tab Switcher */}
      <CardHeader className="pb-0">
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* â”€â”€ Followers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                        className="h-7 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" />
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ Following â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                        className="h-7 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* â”€â”€ Pending Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "requests" && (
          <div>
            {requests.length === 0 ? (
              <EmptyState icon={Clock} text={t("noRequests")} />
            ) : (
              <div className="space-y-1.5">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-amber-500/5"
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={req.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(req.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="flex-1 text-sm font-medium truncate">
                      {req.user.name ?? "?"}
                    </p>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req.id)}
                        disabled={isPending}
                        className="gap-1 h-8"
                      >
                        <UserCheck className="size-3.5" />
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(req.id)}
                        disabled={isPending}
                        className="h-8 text-muted-foreground"
                      >
                        <X className="size-3.5" />
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

// â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="size-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
