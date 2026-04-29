"use client";

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import {
  searchUsersAction,
  followUserAction,
  type UserSearchResult,
} from "@/actions/social.actions";

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

export function UserSearch() {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setDebouncedQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return;

    setIsSearching(true);
    startTransition(async () => {
      try {
        const results = await searchUsersAction(debouncedQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    });
  }, [debouncedQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleFollow = (targetId: string) => {
    startTransition(async () => {
      await followUserAction(targetId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, friendshipStatus: "PENDING" as const } : u
        )
      );
      try {
        router.refresh();
      } catch (_) {}
    });
  };

  return (
    <Card className="border border-white/5 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <CardContent className="pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
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
                  <Badge className={`${proBadgeClass} gap-0.5 px-1.5 py-0 text-[10px]`}>
                    <Sparkles className="size-2.5" aria-hidden />
                    PRO
                  </Badge>
                )}
                <LevelBadge xp={user.xp} compact />
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
  );
}
