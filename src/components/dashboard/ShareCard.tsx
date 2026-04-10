"use client";

import { forwardRef } from "react";
import { Shield, Flame, Trophy, Zap, Target } from "lucide-react";
import { calculateLevel } from "@/lib/level";

// ─── Props ───────────────────────────────────────────────────────────────────

export type ShareCardVariant = "level-up" | "weekly-summary";

export type ShareCardProps = {
  variant: ShareCardVariant;
  userName: string | null;
  userImage: string | null;
  xp: number;
  /** level-up: yeni seviye bilgisi otomatik hesaplanır */
  /** weekly-summary ek alanları */
  weeklyRate?: number; // 0–100
  currentStreak?: number;
  totalCompletions?: number;
};

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard(
    { variant, userName, userImage, xp, weeklyRate, currentStreak, totalCompletions },
    ref
  ) {
    const { level, rank, rankColor, progress, currentLevelXp, xpForNextLevel } =
      calculateLevel(xp);

    const displayName = userName || "Anonim";
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
        className="relative overflow-hidden flex flex-col"
      >
        {/* ── BG Gradient ──────────────────────────────────────────────── */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0b2e] via-[#1a1145] to-[#0d0a26]" />

        {/* Dekoratif blur'lar */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 size-[28rem] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-violet-500/10 blur-[100px]" />

        {/* Grid dokusu */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ── İçerik ───────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col h-full px-16 py-12">
          {/* Üst Bar: Logo + Rütbe rozeti */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-indigo-500 flex items-center justify-center">
                <Zap className="size-5 text-white" />
              </div>
              <span className="text-white/90 font-semibold text-lg tracking-tight">
                Rutin Takip
              </span>
            </div>

            <div
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ backgroundColor: rankColor + "25", border: `1px solid ${rankColor}40` }}
            >
              <Shield className="size-4" style={{ color: rankColor }} />
              <span className="text-sm font-bold" style={{ color: rankColor }}>
                {rank}
              </span>
            </div>
          </div>

          {/* Ana İçerik */}
          <div className="flex-1 flex items-center gap-12 mt-4">
            {/* Sol: Avatar + İsim */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div
                className="size-28 rounded-2xl flex items-center justify-center ring-2 overflow-hidden"
                style={{
                  backgroundColor: rankColor + "15",
                  ringColor: rankColor + "50",
                }}
              >
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userImage}
                    alt={displayName}
                    className="size-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white/80">{initials}</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">{displayName}</p>
                <p className="text-white/50 text-sm">furkancelik.online</p>
              </div>
            </div>

            {/* Sağ: Kart içeriği */}
            <div className="flex-1 space-y-6">
              {variant === "level-up" && (
                <>
                  <div>
                    <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-widest mb-1">
                      Seviye Atladı!
                    </p>
                    <p className="text-white text-5xl font-extrabold tracking-tight">
                      Level{" "}
                      <span style={{ color: rankColor }}>{level}</span>
                    </p>
                    <p className="text-white/50 text-lg mt-1">
                      Toplam <span className="text-indigo-300 font-semibold">{xp} XP</span> kazandı
                    </p>
                  </div>

                  {/* XP Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">İlerleme</span>
                      <span className="text-white/80 font-medium tabular-nums">
                        {currentLevelXp}/{xpForNextLevel} XP
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress * 100}%`,
                          background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Mini istatistikler */}
                  {currentStreak !== undefined && (
                    <div className="flex gap-6 mt-2">
                      <div className="flex items-center gap-2">
                        <Flame className="size-5 text-orange-400" />
                        <div>
                          <p className="text-white font-bold text-lg tabular-nums">{currentStreak}</p>
                          <p className="text-white/40 text-xs">Gün Seri</p>
                        </div>
                      </div>
                      {totalCompletions !== undefined && (
                        <div className="flex items-center gap-2">
                          <Trophy className="size-5 text-yellow-400" />
                          <div>
                            <p className="text-white font-bold text-lg tabular-nums">{totalCompletions}</p>
                            <p className="text-white/40 text-xs">Tamamlama</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {variant === "weekly-summary" && (
                <>
                  <div>
                    <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-widest mb-1">
                      Haftalık Özet
                    </p>
                    <p className="text-white text-4xl font-extrabold tracking-tight">
                      %{weeklyRate ?? 0}{" "}
                      <span className="text-2xl font-semibold text-white/60">Disiplin</span>
                    </p>
                  </div>

                  {/* Büyük stat grid */}
                  <div className="grid grid-cols-3 gap-6">
                    <StatBox
                      icon={<Shield className="size-5" style={{ color: rankColor }} />}
                      value={`Lvl ${level}`}
                      label={rank}
                      color={rankColor}
                    />
                    <StatBox
                      icon={<Flame className="size-5 text-orange-400" />}
                      value={`${currentStreak ?? 0}`}
                      label="Gün Seri"
                      color="#fb923c"
                    />
                    <StatBox
                      icon={<Target className="size-5 text-emerald-400" />}
                      value={`${totalCompletions ?? 0}`}
                      label="Tamamlama"
                      color="#34d399"
                    />
                  </div>

                  {/* XP bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Toplam {xp} XP</span>
                      <span className="text-white/50 tabular-nums">
                        {currentLevelXp}/{xpForNextLevel} XP → Level {level + 1}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress * 100}%`,
                          background: `linear-gradient(90deg, ${rankColor}88, ${rankColor})`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Alt Bar */}
          <div className="flex items-center justify-between mt-auto pt-4">
            <p className="text-white/30 text-xs">
              furkancelik.online • Alışkanlık Takip
            </p>
            <p className="text-white/30 text-xs">
              {new Date().toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

// ─── Yardımcı: Stat Box ──────────────────────────────────────────────────────

function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ backgroundColor: color + "10", border: `1px solid ${color}20` }}
    >
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-white font-bold text-xl tabular-nums">{value}</p>
      <p className="text-white/40 text-xs">{label}</p>
    </div>
  );
}
