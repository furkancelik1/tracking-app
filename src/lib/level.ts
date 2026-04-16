// â”€â”€â”€ Seviye Sabitleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const XP_PER_LEVEL = 100;

// â”€â”€â”€ RÃ¼tbe TanÄ±mlarÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type RankTitle = "Çırak" | "Disiplinli" | "Rutin Canavarı" | "Üstat" | "Efsane";

type RankDef = { minLevel: number; maxLevel: number; title: RankTitle; titleEn: string; color: string };

const RANKS: RankDef[] = [
  { minLevel: 1, maxLevel: 5, title: "Çırak", titleEn: "Apprentice", color: "#94a3b8" },
  { minLevel: 6, maxLevel: 15, title: "Disiplinli", titleEn: "Disciplined", color: "#22d3ee" },
  { minLevel: 16, maxLevel: 30, title: "Rutin Canavarı", titleEn: "Routine Beast", color: "#a855f7" },
  { minLevel: 31, maxLevel: 50, title: "Üstat", titleEn: "Master", color: "#f59e0b" },
  { minLevel: 51, maxLevel: Infinity, title: "Efsane", titleEn: "Legend", color: "#ef4444" },
];

const RANK_ALIASES: Record<string, RankTitle> = {
  Çırak: "Çırak",
  "Ã‡Ä±rak": "Çırak",
  Disiplinli: "Disiplinli",
  "Rutin Canavarı": "Rutin Canavarı",
  "Rutin CanavarÄ±": "Rutin Canavarı",
  Üstat: "Üstat",
  "Ãœstat": "Üstat",
  Efsane: "Efsane",
};

export function normalizeRankTitle(rank: string): RankTitle {
  return RANK_ALIASES[rank] ?? "Çırak";
}

// â”€â”€â”€ Seviye Hesaplama â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type LevelInfo = {
  level: number;
  xp: number;
  /** Mevcut seviyedeki XP (0â€“XP_PER_LEVEL) */
  currentLevelXp: number;
  /** Bir sonraki seviye iÃ§in gereken toplam XP */
  xpForNextLevel: number;
  /** Bir sonraki seviyeye kalan XP */
  xpToNextLevel: number;
  /** 0â€“1 arasÄ± ilerleme yÃ¼zdesi */
  progress: number;
  rank: RankTitle;
  rankColor: string;
};

/**
 * XP'ye gÃ¶re seviye, ilerleme ve rÃ¼tbe hesaplar.
 *
 * FormÃ¼l: Her 100 XP = 1 seviye.
 *   - 0â€“99 XP â†’ Level 1
 *   - 100â€“199 XP â†’ Level 2
 *   - ...
 *
 * Ä°leride formÃ¼lÃ¼ zorlaÅŸtÄ±rmak iÃ§in sadece bu fonksiyonu gÃ¼ncellemeniz yeterlidir.
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
 * Ä°ki XP deÄŸerini karÅŸÄ±laÅŸtÄ±rarak seviye atlayÄ±p atlamadÄ±ÄŸÄ±nÄ± kontrol eder.
 */
export function didLevelUp(oldXp: number, newXp: number): boolean {
  return calculateLevel(oldXp).level < calculateLevel(newXp).level;
}

// â”€â”€â”€ Avatar Ã‡erÃ§eve Sistemi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AvatarFrameConfig = {
  /** Tailwind ring sÄ±nÄ±flarÄ± */
  ring: string;
  /** Glow shadow sÄ±nÄ±flarÄ± */
  glow: string;
  /** Efsane seviyesi animasyon bayraÄŸÄ± */
  isLegend: boolean;
};

/**
 * XP'ye gÃ¶re avatar Ã§erÃ§eve stillerini dÃ¶ner.
 *
 * Ã‡Ä±rak (1-5)       â†’ ince gri Ã§erÃ§eve
 * Disiplinli (6-15)  â†’ cyan Ã§erÃ§eve + hafif glow
 * Rutin CanavarÄ± (16-30) â†’ mor Ã§erÃ§eve + orta glow
 * Ãœstat (31-50)      â†’ altÄ±n Ã§erÃ§eve + gÃ¼Ã§lÃ¼ glow
 * Efsane (51+)       â†’ kÄ±zÄ±l Ã§erÃ§eve + pulsing glow animasyonu
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
    default: // Ã‡Ä±rak
      return {
        ring: "ring-2 ring-slate-400/40",
        glow: "",
        isLegend: false,
      };
  }
}
