"use client";

import { toast } from "sonner";
import { Swords, MessageCircle, Timer } from "lucide-react";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type DuelToastType = "score" | "message" | "ending";

interface DuelToastOptions {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// â”€â”€â”€ Icon Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ICON_MAP: Record<DuelToastType, React.ReactNode> = {
  score: <Swords className="size-4 text-violet-500 shrink-0" />,
  message: <MessageCircle className="size-4 text-violet-500 shrink-0" />,
  ending: <Timer className="size-4 text-red-500 shrink-0" />,
};

const BORDER_MAP: Record<DuelToastType, string> = {
  score: "border-l-4 border-l-violet-500",
  message: "border-l-4 border-l-indigo-500",
  ending: "border-l-4 border-l-red-500",
};

// â”€â”€â”€ Custom Toast Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DuelToastContent({
  id,
  type,
  title,
  description,
  actionLabel,
  onAction,
}: {
  id: string | number;
  type: DuelToastType;
} & DuelToastOptions) {
  return (
    <div
      className={`flex items-start gap-3 w-full rounded-lg bg-background border shadow-lg px-4 py-3 ${BORDER_MAP[type]}`}
    >
      {/* Mini VS / icon */}
      <div className="mt-0.5 size-8 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
        {ICON_MAP[type]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {actionLabel && onAction && (
          <button
            onClick={() => {
              onAction();
              toast.dismiss(id);
            }}
            className="mt-2 text-xs font-semibold text-violet-500 hover:text-violet-600 transition-colors"
          >
            {actionLabel} â†’
          </button>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function fireDuelToast(
  type: DuelToastType,
  options: DuelToastOptions
) {
  toast.custom((id) => (
    <DuelToastContent id={id} type={type} {...options} />
  ), {
    duration: type === "ending" ? 8000 : 5000,
  });
}
