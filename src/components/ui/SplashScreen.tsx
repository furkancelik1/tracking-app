"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
// SVG inline replaces raster Image for crisp vector rendering

const BRAND_GREEN = "#00FF80";

export function SplashScreen() {
  const [isMounted, setIsMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(timer);
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-[224px] h-[224px] flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `1px solid ${BRAND_GREEN}18` }}
                animate={{
                  boxShadow: [
                    `0 0 40px ${BRAND_GREEN}25, 0 0 90px ${BRAND_GREEN}10`,
                    `0 0 65px ${BRAND_GREEN}45, 0 0 130px ${BRAND_GREEN}20`,
                    `0 0 40px ${BRAND_GREEN}25, 0 0 90px ${BRAND_GREEN}10`,
                  ],
                }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-56 h-56 overflow-hidden flex items-center justify-center aspect-square"
              >
                {/* Inline SVG (vector) — prevents pixelation and scales crisply */}
                <svg
                  viewBox="0 0 200 200"
                  className="w-56 h-56"
                  style={{ color: BRAND_GREEN }}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M60 140V60L100 100M100 100L140 140V60M100 100V80"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M100 60L85 80M100 60L115 80"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Glow scan — sweeps top-to-bottom and is clipped by overflow-hidden */}
                <motion.div
                  className="absolute inset-x-0 h-16 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg,
                      transparent 0%,
                      ${BRAND_GREEN}18 30%,
                      ${BRAND_GREEN}38 50%,
                      ${BRAND_GREEN}18 70%,
                      transparent 100%)`,
                  }}
                  initial={{ top: "-20%" }}
                  animate={{ top: "120%" }}
                  transition={{
                    duration: 1.1,
                    delay: 0.55,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1.8,
                  }}
                />
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-4 text-sm font-black tracking-[0.55em] uppercase"
              style={{
                color: BRAND_GREEN,
                textShadow: `0 0 10px ${BRAND_GREEN}65, 0 0 26px ${BRAND_GREEN}28`,
              }}
            >
              ZENITH
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
