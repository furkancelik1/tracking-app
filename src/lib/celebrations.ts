import confetti from "canvas-confetti";

// ─── Tema renkleri ───────────────────────────────────────────────────────────

const THEME_COLORS = ["#6366f1", "#818cf8", "#a855f7", "#c084fc", "#e879f9"];
const GOLD_COLORS = ["#FFD700", "#FFA500", "#FF8C00", "#FFE066", "#a855f7"];

// ─── Hafif patlama — tek rutin tamamlandığında ──────────────────────────────

export function fireConfetti() {
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.7 },
    colors: THEME_COLORS,
    ticks: 120,
    gravity: 1.2,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

// ─── Büyük kutlama — tüm rutinler tamamlandığında ──────────────────────────

export function fireAllDoneConfetti() {
  const defaults = {
    colors: THEME_COLORS,
    ticks: 200,
    gravity: 0.8,
    scalar: 1.1,
    disableForReducedMotion: true,
  };

  // Sol taraftan
  confetti({
    ...defaults,
    particleCount: 80,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.6 },
  });

  // Sağ taraftan
  confetti({
    ...defaults,
    particleCount: 80,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.6 },
  });

  // Ortadan (hafif gecikmeyle)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      startVelocity: 35,
    });
  }, 150);
}

// ─── Haptic feedback — mobil cihazlar için ──────────────────────────────────

export function hapticTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(15);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([10, 30, 10]);
  }
}

// ─── Level Up kutlaması — büyük altın/mor patlama ───────────────────────────

export function fireLevelUpConfetti() {
  const defaults = {
    colors: GOLD_COLORS,
    ticks: 300,
    gravity: 0.6,
    scalar: 1.3,
    disableForReducedMotion: true,
  };

  // Yıldız patlaması — ortadan
  confetti({
    ...defaults,
    particleCount: 120,
    spread: 120,
    origin: { y: 0.45 },
    startVelocity: 40,
    shapes: ["star", "circle"],
  });

  // Sol ve sağ — kademeli
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 60,
      angle: 60,
      spread: 80,
      origin: { x: 0.1, y: 0.5 },
    });
    confetti({
      ...defaults,
      particleCount: 60,
      angle: 120,
      spread: 80,
      origin: { x: 0.9, y: 0.5 },
    });
  }, 200);
}
