"use client";

import React, { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  UserCheck,
  Clock,
  X,
  Users,
  Sparkles,
  Flame,
  Swords,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import {
  searchUsersAction,
  followUserAction,
  acceptFollowAction,
  rejectFollowAction,
  unfollowAction,
  type FriendEntry,
  type FriendRequest,
  type UserSearchResult,
} from "@/actions/social.actions";

type Props = {
  friends: FriendEntry[];
  pendingRequests: FriendRequest[];
  onChallengeClick?: (friendId: string, friendName: string | null) => void;
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

const cardClass = "border border-white/5 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]";

export function FriendList({
  friends: initialFriends,
  pendingRequests: initialRequests,
  onChallengeClick,
}: Props) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    startTransition(async () => {
      try {
        const results = await searchUsersAction(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    });
  };

  const handleFollow = (targetId: string) => {
    startTransition(async () => {
      await followUserAction(targetId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, friendshipStatus: "PENDING" as const } : u))
      );
    });
  };

  const handleAccept = (friendshipId: string) => {
    startTransition(async () => {
      await acceptFollowAction(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
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
      setFriends((prev) => prev.filter((f) => f.id !== targetId));
    });
  };

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-white/10 bg-black/40 pl-10 text-white placeholder:text-zinc-500 focus-visible:border-[#D6FF00]/40 focus-visible:ring-[#D6FF00]/20"
            />
          </div>

          {searchQuery.length >= 2 && (
            <div className="mt-3 space-y-2">
              {isSearching && (
                <div className="flex justify-center py-4">
                  <div
                    className="size-5 animate-spin rounded-full border-2 border-[#D6FF00]/30 border-t-[#D6FF00]"
                    aria-hidden
                  />
                </div>
              )}
              {!isSearching && searchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">{t("noResults")}</p>
              )}
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3 transition-colors hover:border-[#D6FF00]/20 hover:bg-white/[0.03]"
                >
                  <Avatar className="size-9 ring-1 ring-white/10">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.name ?? tc("anonymous")}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {formatXp(user.xp)} {t("xpLabel")}
                    </span>
                  </div>
                  {user.subscriptionTier === "PRO" && (
                    <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1.5 py-0 text-[10px]`}>
                      <Sparkles className="size-2.5" aria-hidden />
                      PRO
                    </Badge>
                  )}
                  {user.friendshipStatus === "NONE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFollow(user.id)}
                      disabled={isPending}
                      className="shrink-0 gap-1.5 border-[#D6FF00]/35 bg-[#D6FF00] text-black hover:bg-[#c8f000]"
                    >
                      <UserPlus className="size-3.5" aria-hidden />
                      {t("follow")}
                    </Button>
                  )}
                  {user.friendshipStatus === "PENDING" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border border-white/10 bg-zinc-900 text-zinc-300"
                    >
                      <Clock className="size-3" aria-hidden />
                      {t("pending")}
                    </Badge>
                  )}
                  {user.friendshipStatus === "ACCEPTED" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border border-[#D6FF00]/25 bg-[#D6FF00]/10 text-[#D6FF00]"
                    >
                      <UserCheck className="size-3" aria-hidden />
                      {t("following")}
                    </Badge>
                  )}
                  {user.friendshipStatus === "INCOMING" && (
                    <Button
                      size="sm"
                      onClick={() => handleFollow(user.id)}
                      disabled={isPending}
                      className="shrink-0 gap-1.5 bg-[#D6FF00] text-black hover:bg-[#c8f000]"
                    >
                      <UserPlus className="size-3.5" aria-hidden />
                      {t("accept")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card className={`${cardClass} border-[#D6FF00]/20`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-white">
              <div className="flex size-8 items-center justify-center rounded-lg border border-[#D6FF00]/30 bg-[#D6FF00]/10">
                <Clock className="size-4 text-[#D6FF00]" aria-hidden />
              </div>
              {t("pendingRequests")}
              <Badge
                variant="secondary"
                className="ml-auto border border-white/10 bg-black/60 text-[#D6FF00]"
              >
                {requests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-3"
              >
                <Avatar className="size-9 ring-1 ring-white/10">
                  <AvatarImage src={req.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">{getInitials(req.user.name)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {req.user.name ?? tc("anonymous")}
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
          </CardContent>
        </Card>
      )}

      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-white">
            <div className="flex size-8 items-center justify-center rounded-lg border border-[#D6FF00]/30 bg-[#D6FF00]/10">
              <Users className="size-4 text-[#D6FF00]" aria-hidden />
            </div>
            {t("friendsList")}
            <span className="ml-auto text-xs font-normal normal-case tracking-normal text-zinc-500">
              {t("friendsCount", { count: friends.length })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-3 size-10 text-[#D6FF00]/25" aria-hidden />
              <p className="text-sm font-semibold text-white">{t("noFriends")}</p>
              <p className="mt-1 text-xs text-zinc-500">{t("noFriendsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-white/5 hover:bg-white/[0.03]"
                >
                  <Avatar className="size-9 ring-1 ring-white/10">
                    <AvatarImage src={friend.image ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(friend.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {friend.name ?? tc("anonymous")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>{formatXp(friend.xp)} XP</span>
                      {friend.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 font-medium text-[#D6FF00]">
                          <Flame className="size-3" aria-hidden /> {friend.currentStreak}
                        </span>
                      )}
                    </div>
                  </div>
                  {friend.subscriptionTier === "PRO" && (
                    <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1.5 py-0 text-[10px]`}>
                      <Sparkles className="size-2.5" aria-hidden />
                      PRO
                    </Badge>
                  )}
                  <LevelBadge xp={friend.xp} compact />
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {onChallengeClick && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onChallengeClick(friend.id, friend.name)}
                        className="h-7 gap-1 border-white/15 text-xs text-zinc-300 hover:border-[#D6FF00]/40 hover:bg-[#D6FF00]/10 hover:text-[#D6FF00]"
                      >
                        <Swords className="size-3" aria-hidden />
                        {t("challenge")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnfollow(friend.id)}
                      disabled={isPending}
                      className="h-7 text-xs text-zinc-500 hover:text-red-400"
                    >
                      <X className="size-3" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
