import confetti from "canvas-confetti";

// â”€â”€â”€ Tema renkleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const THEME_COLORS = ["#6366f1", "#818cf8", "#a855f7", "#c084fc", "#e879f9"];
const GOLD_COLORS = ["#FFD700", "#FFA500", "#FF8C00", "#FFE066", "#a855f7"];

// â”€â”€â”€ Hafif patlama â€” tek rutin tamamlandÄ±ÄŸÄ±nda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ BÃ¼yÃ¼k kutlama â€” tÃ¼m rutinler tamamlandÄ±ÄŸÄ±nda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // SaÄŸ taraftan
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

// â”€â”€â”€ Haptic feedback â€” mobil cihazlar iÃ§in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Level Up kutlamasÄ± â€” bÃ¼yÃ¼k altÄ±n/mor patlama â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function fireLevelUpConfetti() {
  const defaults = {
    colors: GOLD_COLORS,
    ticks: 300,
    gravity: 0.6,
    scalar: 1.3,
    disableForReducedMotion: true,
  };

  // YÄ±ldÄ±z patlamasÄ± â€” ortadan
  confetti({
    ...defaults,
    particleCount: 120,
    spread: 120,
    origin: { y: 0.45 },
    startVelocity: 40,
    shapes: ["star", "circle"],
  });

  // Sol ve saÄŸ â€” kademeli
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

// â”€â”€â”€ SatÄ±n alma kutlamasÄ± â€” altÄ±n coin efekti â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function firePurchaseConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: GOLD_COLORS,
    ticks: 150,
    gravity: 1,
    scalar: 1,
    shapes: ["circle"],
    disableForReducedMotion: true,
  });

  hapticSuccess();
}
