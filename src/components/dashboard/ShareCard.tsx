"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { Shield, Flame, Trophy, Zap, Target, Award, Star, Sunrise } from "lucide-react";
import { calculateLevel, normalizeRankTitle } from "@/lib/level";
import { useTranslations, useLocale } from "next-intl";

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ShareCardVariant = "level-up" | "weekly-summary" | "single-routine";
export type ShareCardLayout = "landscape" | "portrait";

export type ShareCardProps = {
  variant: ShareCardVariant;
  layout?: ShareCardLayout;
  userName: string | null;
  userImage: string | null;
  xp: number;
  /** weekly-summary ek alanlarÄ± */
  weeklyRate?: number;
  currentStreak?: number;
  totalCompletions?: number;
  /** single-routine ek alanlarÄ± */
  routineName?: string;
  routineIcon?: string;
  routineColor?: string;
  routineStreak?: number;
};

// â”€â”€â”€ Achievement Sticker Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Sticker = { key: string; icon: React.ReactNode; color: string };

function getStickers(
  currentStreak: number | undefined,
  totalCompletions: number | undefined,
  weeklyRate: number | undefined,
  level: number
): Sticker[] {
  const stickers: Sticker[] = [];
  if ((currentStreak ?? 0) >= 10)
    stickers.push({ key: "streak10", icon: <Flame className="size-3.5" />, color: "#f97316" });
  if ((currentStreak ?? 0) >= 30)
    stickers.push({ key: "streak30", icon: <Flame className="size-3.5" />, color: "#ef4444" });
  if ((weeklyRate ?? 0) >= 80)
    stickers.push({ key: "consistencyKing", icon: <Award className="size-3.5" />, color: "#a855f7" });
  if ((totalCompletions ?? 0) >= 100)
    stickers.push({ key: "centurion", icon: <Trophy className="size-3.5" />, color: "#eab308" });
  if (level >= 10)
    stickers.push({ key: "dedicated", icon: <Star className="size-3.5" />, color: "#3b82f6" });
  if ((currentStreak ?? 0) >= 7)
    stickers.push({ key: "earlyBird", icon: <Sunrise className="size-3.5" />, color: "#06b6d4" });
  return stickers.slice(0, 3); // max 3
}

// â”€â”€â”€ BileÅŸen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard(
    {
      variant,
      layout = "landscape",
      userName,
      userImage,
      xp,
      weeklyRate,
      currentStreak,
      totalCompletions,
      routineName,
      routineIcon,
      routineColor,
      routineStreak,
    },
    ref
  ) {
    const t = useTranslations("share");
    const tLevels = useTranslations("levels");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const { level, rank, rankColor, progress, currentLevelXp, xpForNextLevel } =
      calculateLevel(xp);
    const normalizedRank = normalizeRankTitle(rank);

    const displayName = userName || tCommon("anonymous");
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const isPortrait = layout === "portrait";
    const stickers = getStickers(currentStreak, totalCompletions, weeklyRate, level);
    const [renderDate, setRenderDate] = useState("");

    useEffect(() => {
      setRenderDate(
        new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date())
      );
    }, [locale]);

    const w = isPortrait ? 1080 : 1200;
    const h = isPortrait ? 1920 : 630;

    return (
      <div
        ref={ref}
        style={{
          width: w,
          height: h,
          fontFamily: "var(--font-inter, 'Inter'), 'Segoe UI', system-ui, sans-serif",
        }}
        className="relative overflow-hidden flex flex-col"
      >
        <div className="absolute inset-0 bg-black" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 80% at 80% 10%, rgba(214,255,0,0.14) 0%, transparent 50%), radial-gradient(80% 60% at 10% 90%, rgba(220,38,38,0.08) 0%, transparent 45%)",
          }}
        />
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-[#D6FF00]/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 size-64 rounded-full bg-red-600/10 blur-[90px]" />

        {/* Grid dokusu */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* â”€â”€ Ä°Ã§erik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div
          className={`relative z-10 flex flex-col h-full ${
            isPortrait ? "px-12 py-16" : "px-16 py-12"
          }`}
        >
          {/* Ãœst Bar: Logo + RÃ¼tbe rozeti */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#D6FF00] flex items-center justify-center">
                <Zap className="size-5 text-black" />
              </div>
              <span className="text-white font-black text-xl tracking-tighter uppercase">
                {tCommon("appName")}
              </span>
            </div>

            <div
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ backgroundColor: rankColor + "25", border: `1px solid ${rankColor}40` }}
            >
              <Shield className="size-4" style={{ color: rankColor }} />
              <span className="text-sm font-bold" style={{ color: rankColor }}>
                {tLevels(`ranks.${normalizedRank}`)}
              </span>
            </div>
          </div>

          {/* Ana Ä°Ã§erik */}
          <div
            className={`flex-1 flex ${
              isPortrait ? "flex-col items-center gap-10 mt-12" : "items-center gap-12 mt-4"
            }`}
          >
            {/* Avatar + Ä°sim */}
            <div
              className={`flex flex-col items-center gap-4 shrink-0 ${
                isPortrait ? "" : ""
              }`}
            >
              <div
                className={`${isPortrait ? "size-40" : "size-28"} rounded-2xl flex items-center justify-center ring-2 overflow-hidden`}
                style={{
                  backgroundColor: rankColor + "15",
                  ["--tw-ring-color" as string]: rankColor + "50",
                } as React.CSSProperties}
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
                  <span className={`${isPortrait ? "text-5xl" : "text-3xl"} font-bold text-white/80`}>
                    {initials}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className={`text-white font-semibold ${isPortrait ? "text-2xl" : "text-lg"}`}>
                  {displayName}
                </p>
                <p className="text-white/50 text-sm">{tCommon("site")}</p>
              </div>
            </div>

            {/* Kart iÃ§eriÄŸi */}
            <div className={`${isPortrait ? "w-full" : "flex-1"} space-y-6`}>
              {/* â”€â”€ Level Up Variant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {variant === "level-up" && (
                <>
                  <div className={isPortrait ? "text-center" : ""}>
                    <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-widest mb-1">
                      {t("levelUp.label")}
                    </p>
                    <p className={`text-white font-extrabold tracking-tight ${isPortrait ? "text-6xl" : "text-5xl"}`}>
                      Level{" "}
                      <span style={{ color: rankColor }}>{level}</span>
                    </p>
                    <p className="text-white/50 text-lg mt-1">
                      {t("levelUp.totalXp", { xp })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">{t("levelUp.progress")}</span>
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

                  {currentStreak !== undefined && (
                    <div className={`flex gap-6 mt-2 ${isPortrait ? "justify-center" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Flame className="size-5 text-orange-400" />
                        <div>
                          <p className="text-white font-bold text-lg tabular-nums">{currentStreak}</p>
                          <p className="text-white/40 text-xs">{t("statLabels.dayStreak")}</p>
                        </div>
                      </div>
                      {totalCompletions !== undefined && (
                        <div className="flex items-center gap-2">
                          <Trophy className="size-5 text-yellow-400" />
                          <div>
                            <p className="text-white font-bold text-lg tabular-nums">{totalCompletions}</p>
                            <p className="text-white/40 text-xs">{t("statLabels.completions")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* â”€â”€ Weekly Summary Variant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {variant === "weekly-summary" && (
                <>
                  <div className={isPortrait ? "text-center" : ""}>
                    <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-widest mb-1">
                      {t("weeklySummary.label")}
                    </p>
                    <p className={`text-white font-extrabold tracking-tight ${isPortrait ? "text-5xl" : "text-4xl"}`}>
                      %{weeklyRate ?? 0}{" "}
                      <span className="text-2xl font-semibold text-white/60">{t("weeklySummary.discipline")}</span>
                    </p>
                  </div>

                  <div className={`grid ${isPortrait ? "grid-cols-1 gap-4" : "grid-cols-3 gap-6"}`}>
                    <StatBox
                      icon={<Shield className="size-5" style={{ color: rankColor }} />}
                      value={`Lvl ${level}`}
                      label={tLevels(`ranks.${normalizedRank}`)}
                      color={rankColor}
                    />
                    <StatBox
                      icon={<Flame className="size-5 text-orange-400" />}
                      value={`${currentStreak ?? 0}`}
                      label={t("statLabels.dayStreak")}
                      color="#fb923c"
                    />
                    <StatBox
                      icon={<Target className="size-5 text-emerald-400" />}
                      value={`${totalCompletions ?? 0}`}
                      label={t("statLabels.completions")}
                      color="#34d399"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">{t("weeklySummary.totalXp", { xp })}</span>
                      <span className="text-white/50 tabular-nums">
                        {currentLevelXp}/{xpForNextLevel} XP â†’ Level {level + 1}
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

              {/* â”€â”€ Single Routine Variant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {variant === "single-routine" && (
                <>
                  <div className={isPortrait ? "text-center" : ""}>
                    <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-widest mb-1">
                      {t("singleRoutine.label")}
                    </p>
                    <div className={`flex items-center gap-4 ${isPortrait ? "justify-center" : ""} mt-3`}>
                      <div
                        className="size-16 rounded-2xl flex items-center justify-center"
                        style={{
                          backgroundColor: (routineColor ?? "#3b82f6") + "25",
                          border: `2px solid ${(routineColor ?? "#3b82f6")}50`,
                        }}
                      >
                        <span className="text-2xl" style={{ color: routineColor ?? "#3b82f6" }}>
                          {routineIcon ?? "âœ“"}
                        </span>
                      </div>
                      <div className={isPortrait ? "text-center" : ""}>
                        <p className={`text-white font-extrabold tracking-tight ${isPortrait ? "text-4xl" : "text-3xl"}`}>
                          {routineName ?? "Routine"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex gap-8 ${isPortrait ? "justify-center mt-4" : "mt-2"}`}>
                    <div className="flex items-center gap-3">
                      <Flame className="size-7 text-orange-400" />
                      <div>
                        <p className="text-white font-bold text-3xl tabular-nums">
                          {routineStreak ?? 0}
                        </p>
                        <p className="text-white/40 text-sm">{t("statLabels.dayStreak")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="size-7" style={{ color: rankColor }} />
                      <div>
                        <p className="text-white font-bold text-3xl tabular-nums">
                          Lvl {level}
                        </p>
                        <p className="text-white/40 text-sm">{tLevels(`ranks.${normalizedRank}`)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* â”€â”€ Achievement Stickers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {stickers.length > 0 && (
            <div className={`flex gap-2.5 ${isPortrait ? "justify-center mt-8" : "mt-4"}`}>
              {stickers.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: s.color + "18",
                    border: `1px solid ${s.color}35`,
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>
                    {t(`stickers.${s.key}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Alt Bar */}
          <div className={`flex items-center justify-between mt-auto ${isPortrait ? "pt-8" : "pt-4"}`}>
            <p className="text-white/30 text-xs">
              {tCommon("site")} â€¢ {t("footerBrand")}
            </p>
            <p className="text-white/30 text-xs" suppressHydrationWarning>
              {renderDate || " "}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

// â”€â”€â”€ YardÄ±mcÄ±: Stat Box â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
