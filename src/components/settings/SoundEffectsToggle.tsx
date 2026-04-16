"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_KEY = "zen-sound-enabled";

export function SoundEffectsToggle() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEnabled(stored !== "false");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  if (!mounted) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Volume2 className="size-4 text-muted-foreground" />
        ) : (
          <VolumeX className="size-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">Sound Effects</p>
          <p className="text-xs text-muted-foreground">
            Play a tone when you complete a routine
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          enabled ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
