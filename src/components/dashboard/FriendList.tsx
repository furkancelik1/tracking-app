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

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  friends: FriendEntry[];
  pendingRequests: FriendRequest[];
  onChallengeClick?: (friendId: string, friendName: string | null) => void;
};

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

// ─── Component ───────────────────────────────────────────────────────────────

export function FriendList({ friends: initialFriends, pendingRequests: initialRequests, onChallengeClick }: Props) {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);

  // ── Search ──────────────────────────────────────────────────
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

  // ── Follow ──────────────────────────────────────────────────
  const handleFollow = (targetId: string) => {
    startTransition(async () => {
      await followUserAction(targetId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, friendshipStatus: "PENDING" as const } : u))
      );
    });
  };

  // ── Accept ──────────────────────────────────────────────────
  const handleAccept = (friendshipId: string) => {
    startTransition(async () => {
      await acceptFollowAction(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    });
  };

  // ── Reject ──────────────────────────────────────────────────
  const handleReject = (friendshipId: string) => {
    startTransition(async () => {
      await rejectFollowAction(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    });
  };

  // ── Unfollow ────────────────────────────────────────────────
  const handleUnfollow = (targetId: string) => {
    startTransition(async () => {
      await unfollowAction(targetId);
      setFriends((prev) => prev.filter((f) => f.id !== targetId));
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Search Bar ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="mt-3 space-y-2">
              {isSearching && (
                <div className="flex justify-center py-4">
                  <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {!isSearching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("noResults")}
                </p>
              )}
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/40 transition-colors"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name ?? tc("anonymous")}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatXp(user.xp)} {t("xpLabel")}
                    </span>
                  </div>
                  {user.subscriptionTier === "PRO" && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                      <Sparkles className="size-2.5" /> PRO
                    </Badge>
                  )}
                  {user.friendshipStatus === "NONE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFollow(user.id)}
                      disabled={isPending}
                      className="shrink-0 gap-1.5"
                    >
                      <UserPlus className="size-3.5" />
                      {t("follow")}
                    </Button>
                  )}
                  {user.friendshipStatus === "PENDING" && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="size-3" />
                      {t("pending")}
                    </Badge>
                  )}
                  {user.friendshipStatus === "ACCEPTED" && (
                    <Badge variant="secondary" className="gap-1 text-emerald-500">
                      <UserCheck className="size-3" />
                      {t("following")}
                    </Badge>
                  )}
                  {user.friendshipStatus === "INCOMING" && (
                    <Button
                      size="sm"
                      onClick={() => handleFollow(user.id)}
                      disabled={isPending}
                      className="shrink-0 gap-1.5"
                    >
                      <UserPlus className="size-3.5" />
                      {t("accept")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Requests ───────────────────────────────────── */}
      {requests.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-amber-500" />
              {t("pendingRequests")}
              <Badge variant="secondary" className="ml-auto">
                {requests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-lg border p-3 bg-amber-500/5"
              >
                <Avatar className="size-9">
                  <AvatarImage src={req.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(req.user.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 text-sm font-medium truncate">
                  {req.user.name ?? tc("anonymous")}
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
          </CardContent>
        </Card>
      )}

      {/* ── Friends List ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-indigo-400" />
            {t("friendsList")}
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {t("friendsCount", { count: friends.length })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium">{t("noFriends")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("noFriendsDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors group"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={friend.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(friend.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name ?? tc("anonymous")}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatXp(friend.xp)} XP</span>
                      {friend.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <Flame className="size-3" /> {friend.currentStreak}
                        </span>
                      )}
                    </div>
                  </div>
                  {friend.subscriptionTier === "PRO" && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                      <Sparkles className="size-2.5" /> PRO
                    </Badge>
                  )}
                  <LevelBadge xp={friend.xp} compact />
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onChallengeClick && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onChallengeClick(friend.id, friend.name)}
                        className="h-7 text-xs gap-1"
                      >
                        <Swords className="size-3" />
                        {t("challenge")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnfollow(friend.id)}
                      disabled={isPending}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
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
