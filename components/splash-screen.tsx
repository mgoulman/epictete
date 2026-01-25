"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Check if splash has been shown in this session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");

    if (hasSeenSplash) {
      setIsVisible(false);
      setHasAnimated(true);
      return;
    }

    // Show splash for 4 seconds then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("hasSeenSplash", "true");
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Don't render anything after animation is complete
  if (hasAnimated && !isVisible) {
    return null;
  }

  return (
    <AnimatePresence onExitComplete={() => setHasAnimated(true)}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#EDE6D6]"
        >
          <div className="flex flex-col items-center">
            {/* Logo Icon with animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Image
                src="/logos/logo-icon.png"
                alt="Epictète"
                width={180}
                height={180}
                priority
                className="w-36 h-36 md:w-44 md:h-44"
              />
            </motion.div>

            {/* Restaurant name */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-[#606338] text-lg md:text-xl font-heading tracking-[0.2em] uppercase"
            >
              Epictète
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-2 text-[#606338]/60 text-sm tracking-wider"
            >
              Restaurant
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className="mt-8"
            >
              <div className="w-8 h-0.5 bg-[#606338]/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-full h-full bg-[#606338]/60"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
