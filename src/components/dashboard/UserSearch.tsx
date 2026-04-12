"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
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
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import {
  searchUsersAction,
  followUserAction,
  type UserSearchResult,
} from "@/actions/social.actions";

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

export function UserSearch() {
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced Search (400ms) ────────────────────────────────
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

  // ── Follow ──────────────────────────────────────────────────
  const handleFollow = (targetId: string) => {
    startTransition(async () => {
      await followUserAction(targetId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, friendshipStatus: "PENDING" as const } : u
        )
      );
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
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
                  <p className="text-sm font-medium truncate">
                    {user.name ?? tc("anonymous")}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatXp(user.xp)} {t("xpLabel")}
                  </span>
                </div>
                {user.subscriptionTier === "PRO" && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                    <Sparkles className="size-2.5" /> PRO
                  </Badge>
                )}
                <LevelBadge xp={user.xp} compact />
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
  );
}
