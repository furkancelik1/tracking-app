"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardPayload } from "@/actions/leaderboard.actions";
import { Trophy, Medal, Flame, Crown } from "lucide-react";
import { LevelBadge } from "@/components/dashboard/LevelBadge";

// ─── Podium renkleri ─────────────────────────────────────────────────────────

const PODIUM = [
  { ring: "ring-yellow-400", bg: "bg-yellow-400/10", text: "text-yellow-400", icon: Crown, label: "Altın" },
  { ring: "ring-zinc-300", bg: "bg-zinc-300/10", text: "text-zinc-300", icon: Medal, label: "Gümüş" },
  { ring: "ring-amber-600", bg: "bg-amber-600/10", text: "text-amber-600", icon: Medal, label: "Bronz" },
] as const;

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

// ─── Podium Bileşeni (Top 3) ────────────────────────────────────────────────

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  // Sıralama: 2. | 1. | 3. (görsel podyum düzeni)
  const order = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[];
  const heights = ["h-28", "h-36", "h-24"];

  if (entries.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8">
      {order.map((entry, i) => {
        const actualRank = entry.rank - 1; // 0-indexed
        const style = PODIUM[actualRank];
        if (!style) return null;
        const Icon = style.icon;

        return (
          <div
            key={entry.id}
            className={cn("flex flex-col items-center gap-2", heights[i])}
          >
            <div className="relative">
              <Avatar
                className={cn(
                  "ring-2 transition-all",
                  style.ring,
                  actualRank === 0 ? "size-16 sm:size-20" : "size-12 sm:size-16"
                )}
              >
                <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ""} />
                <AvatarFallback className="text-sm font-semibold">
                  {getInitials(entry.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-1",
                  style.bg
                )}
              >
                <Icon className={cn("size-3.5", style.text)} />
              </span>
            </div>
            <p className="text-sm font-semibold truncate max-w-[80px] sm:max-w-[120px] text-center">
              {entry.name ?? "Anonim"}
              {entry.isCurrentUser && (
                <span className="text-xs text-indigo-400 ml-1">(sen)</span>
              )}
            </p>
            <Badge
              variant="secondary"
              className={cn("tabular-nums text-xs", style.text)}
            >
              {formatXp(entry.xp)} XP
            </Badge>
            <LevelBadge xp={entry.xp} compact />
            {entry.currentStreak > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-orange-400">
                <Flame className="size-3" /> {entry.currentStreak}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sıralama Tablosu (4–10) ────────────────────────────────────────────────

function RankTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors",
            entry.isCurrentUser
              ? "bg-indigo-500/10 border border-indigo-500/20"
              : "bg-card/50 hover:bg-card/80"
          )}
        >
          <span className="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">
            {entry.rank}
          </span>
          <Avatar className="size-8">
            <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ""} />
            <AvatarFallback className="text-xs">{getInitials(entry.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entry.name ?? "Anonim"}
              {entry.isCurrentUser && (
                <span className="text-xs text-indigo-400 ml-1">(sen)</span>
              )}
            </p>
          </div>
          <LevelBadge xp={entry.xp} compact />
          {entry.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
              <Flame className="size-3" /> {entry.currentStreak}
            </span>
          )}
          <span className="text-sm font-semibold tabular-nums text-indigo-400 shrink-0">
            {formatXp(entry.xp)} XP
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Kişisel Panel (altta sabit) ────────────────────────────────────────────

function PersonalPanel({ entry, totalUsers }: { entry: LeaderboardEntry; totalUsers: number }) {
  return (
    <Card className="border-indigo-500/30 bg-indigo-500/5 mt-6">
      <CardContent className="flex items-center gap-4 py-4">
        <span className="text-lg font-bold tabular-nums text-indigo-400">
          #{entry.rank}
        </span>
        <Avatar className="size-10 ring-2 ring-indigo-500/50">
          <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ""} />
          <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.name ?? "Anonim"}</p>
          <p className="text-xs text-muted-foreground">
            {totalUsers} kullanıcı arasında #{entry.rank}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums text-indigo-400">
            {formatXp(entry.xp)} XP
          </p>
          {entry.currentStreak > 0 && (
            <span className="flex items-center justify-end gap-0.5 text-xs text-orange-400">
              <Flame className="size-3" /> {entry.currentStreak} gün seri
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function LeaderboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
        <Trophy className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold">Henüz sıralama yok</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Rutinlerini tamamlayarak XP kazan ve liderlik tablosuna adını yazdır!
      </p>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

type Props = {
  data: LeaderboardPayload;
};

export function Leaderboard({ data }: Props) {
  const { topTen, currentUser, totalUsers } = data;

  if (topTen.length === 0) return <LeaderboardEmpty />;

  const podiumEntries = topTen.slice(0, 3);
  const restEntries = topTen.slice(3);

  return (
    <div>
      {/* Podium — Top 3 */}
      <Podium entries={podiumEntries} />

      {/* Tablo — 4-10 */}
      <RankTable entries={restEntries} />

      {/* Kişisel panel — kullanıcı top 10'da değilse */}
      {currentUser && <PersonalPanel entry={currentUser} totalUsers={totalUsers} />}
    </div>
  );
}
