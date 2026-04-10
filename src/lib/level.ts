// ─── Seviye Sabitleri ─────────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;

// ─── Rütbe Tanımları ─────────────────────────────────────────────────────────

export type RankTitle = "Çırak" | "Disiplinli" | "Rutin Canavarı" | "Üstat" | "Efsane";

type RankDef = { minLevel: number; maxLevel: number; title: RankTitle; titleEn: string; color: string };

const RANKS: RankDef[] = [
  { minLevel: 1, maxLevel: 5, title: "Çırak", titleEn: "Apprentice", color: "#94a3b8" },
  { minLevel: 6, maxLevel: 15, title: "Disiplinli", titleEn: "Disciplined", color: "#22d3ee" },
  { minLevel: 16, maxLevel: 30, title: "Rutin Canavarı", titleEn: "Routine Beast", color: "#a855f7" },
  { minLevel: 31, maxLevel: 50, title: "Üstat", titleEn: "Master", color: "#f59e0b" },
  { minLevel: 51, maxLevel: Infinity, title: "Efsane", titleEn: "Legend", color: "#ef4444" },
];

// ─── Seviye Hesaplama ────────────────────────────────────────────────────────

export type LevelInfo = {
  level: number;
  xp: number;
  /** Mevcut seviyedeki XP (0–XP_PER_LEVEL) */
  currentLevelXp: number;
  /** Bir sonraki seviye için gereken toplam XP */
  xpForNextLevel: number;
  /** Bir sonraki seviyeye kalan XP */
  xpToNextLevel: number;
  /** 0–1 arası ilerleme yüzdesi */
  progress: number;
  rank: RankTitle;
  rankColor: string;
};

/**
 * XP'ye göre seviye, ilerleme ve rütbe hesaplar.
 *
 * Formül: Her 100 XP = 1 seviye.
 *   - 0–99 XP → Level 1
 *   - 100–199 XP → Level 2
 *   - ...
 *
 * İleride formülü zorlaştırmak için sadece bu fonksiyonu güncellemeniz yeterlidir.
 */
export function calculateLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - currentLevelXp;
  const progress = currentLevelXp / XP_PER_LEVEL;

  const rankDef = RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel) ?? RANKS[0];

  return {
    level,
    xp: safeXp,
    currentLevelXp,
    xpForNextLevel,
    xpToNextLevel,
    progress,
    rank: rankDef.title,
    rankColor: rankDef.color,
  };
}

/**
 * İki XP değerini karşılaştırarak seviye atlayıp atlamadığını kontrol eder.
 */
export function didLevelUp(oldXp: number, newXp: number): boolean {
  return calculateLevel(oldXp).level < calculateLevel(newXp).level;
}
