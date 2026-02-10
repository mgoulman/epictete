"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Show splash for 2 seconds then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F0E7CE]"
        >
          <div className="flex flex-col items-center justify-center px-8 w-full max-w-md mx-auto text-center">
            {/* Full logo with name */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full flex justify-center"
            >
              <Image
                src="/logos/logo-full.png"
                alt="Epictète Restaurant"
                width={400}
                height={400}
                priority
                className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[384px] h-auto"
              />
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className="mt-6 sm:mt-8"
            >
              <div className="w-16 sm:w-20 h-1 bg-[#606338]/20 rounded-full overflow-hidden">
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
