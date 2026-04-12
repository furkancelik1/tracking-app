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

// ─── Avatar Çerçeve Sistemi ──────────────────────────────────────────────────

export type AvatarFrameConfig = {
  /** Tailwind ring sınıfları */
  ring: string;
  /** Glow shadow sınıfları */
  glow: string;
  /** Efsane seviyesi animasyon bayrağı */
  isLegend: boolean;
};

/**
 * XP'ye göre avatar çerçeve stillerini döner.
 *
 * Çırak (1-5)       → ince gri çerçeve
 * Disiplinli (6-15)  → cyan çerçeve + hafif glow
 * Rutin Canavarı (16-30) → mor çerçeve + orta glow
 * Üstat (31-50)      → altın çerçeve + güçlü glow
 * Efsane (51+)       → kızıl çerçeve + pulsing glow animasyonu
 */
export function getAvatarFrame(xp: number): AvatarFrameConfig {
  const { rank } = calculateLevel(xp);

  switch (rank) {
    case "Disiplinli":
      return {
        ring: "ring-2 ring-cyan-400/70",
        glow: "shadow-[0_0_10px_rgba(34,211,238,0.25)]",
        isLegend: false,
      };
    case "Rutin Canavarı":
      return {
        ring: "ring-2 ring-purple-500/80",
        glow: "shadow-[0_0_12px_rgba(168,85,247,0.35)]",
        isLegend: false,
      };
    case "Üstat":
      return {
        ring: "ring-[3px] ring-amber-400/90",
        glow: "shadow-[0_0_16px_rgba(245,158,11,0.4)]",
        isLegend: false,
      };
    case "Efsane":
      return {
        ring: "ring-[3px] ring-red-500",
        glow: "shadow-[0_0_20px_rgba(239,68,68,0.5)]",
        isLegend: true,
      };
    default: // Çırak
      return {
        ring: "ring-2 ring-slate-400/40",
        glow: "",
        isLegend: false,
      };
  }
}
