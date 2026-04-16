"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const MOTTOS = [
  "Discipline is choosing what you want most over what you want now.",
  "We suffer more in imagination than in reality.",
  "Do not seek for things to happen the way you want them to; but wish that what happens, happen as it is.",
  "The obstacle is the way.",
  "Waste no more time arguing what a good man should be. Be one.",
  "You have power over your mind, not outside events. Realize this, and you will find strength.",
  "The best revenge is to be unlike your enemy.",
  "It is not death that a man should fear, but he should fear never beginning to live.",
  "First say to yourself what you would be, then do what you have to do.",
  "Confine yourself to the present.",
  "He who fears death will never do anything worth of a man who is alive.",
  "Make the best use of what is in your power, and take the rest as it happens.",
  "How long are you going to wait before you demand the best for yourself?",
  "Do what nature requires. Set out immediately if possible.",
  "Luck is what happens when preparation meets opportunity.",
];

function getDailyMotto(): string {
  // Deterministic per day — same motto until midnight
  const seed = new Date().toDateString()
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return MOTTOS[seed % MOTTOS.length] ?? "";
}

export function MottoDisplay() {
  const [motto, setMotto] = useState<string | null>(null);

  useEffect(() => {
    setMotto(getDailyMotto());
  }, []);

  if (!motto) return null;

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 1.2, ease: "easeInOut" }}
      className="text-center text-xs font-thin tracking-widest text-white/30 px-4 select-none"
      suppressHydrationWarning
    >
      &ldquo;{motto}&rdquo;
    </motion.p>
  );
}