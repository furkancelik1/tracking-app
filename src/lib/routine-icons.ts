import {
  CheckCircle,
  Dumbbell,
  BookOpen,
  Brain,
  Coffee,
  Heart,
  Moon,
  Sun,
  Music,
  Droplet,
  Bike,
  Flame,
  Pencil,
  Target,
  Zap,
  Leaf,
  Star,
  Trophy,
  Smile,
  Globe,
  Home,
  Timer,
  Utensils,
  Activity,
  type LucideIcon,
} from "lucide-react";

// â”€â”€â”€ Ä°kon haritasÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle,
  Dumbbell,
  BookOpen,
  Brain,
  Coffee,
  Heart,
  Moon,
  Sun,
  Music,
  Droplet,
  Bike,
  Flame,
  Pencil,
  Target,
  Zap,
  Leaf,
  Star,
  Trophy,
  Smile,
  Globe,
  Home,
  Timer,
  Utensils,
  Activity,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP) as (keyof typeof ICON_MAP)[];

// â”€â”€â”€ Renk paleti â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Mavi" },
  { value: "#10b981", label: "YeÅŸil" },
  { value: "#f59e0b", label: "SarÄ±" },
  { value: "#ef4444", label: "KÄ±rmÄ±zÄ±" },
  { value: "#8b5cf6", label: "Mor" },
  { value: "#ec4899", label: "Pembe" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#f97316", label: "Turuncu" },
] as const;

export const DEFAULT_ICON = "CheckCircle";
export const DEFAULT_COLOR = "#3b82f6";
