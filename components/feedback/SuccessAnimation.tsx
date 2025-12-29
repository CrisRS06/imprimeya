"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useCanvasGestures";

interface SuccessAnimationProps {
  show: boolean;
  title?: string;
  message?: string;
  showConfetti?: boolean;
  onComplete?: () => void;
  className?: string;
}

// Configuracion de confetti
const CONFETTI_COLORS = [
  "#0ea5e9", // sky-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  rotation: number;
  delay: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5,
  }));
}

export function SuccessAnimation({
  show,
  title = "Listo",
  message,
  showConfetti = true,
  onComplete,
  className,
}: SuccessAnimationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      hapticFeedback("success");
      if (showConfetti) {
        setConfetti(generateConfetti(30));
      }
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
    }
  }, [show, showConfetti, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm",
            className
          )}
        >
          {/* Confetti */}
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {confetti.map((piece) => (
                <motion.div
                  key={piece.id}
                  initial={{
                    x: `${piece.x}vw`,
                    y: -20,
                    rotate: piece.rotation,
                    opacity: 1,
                  }}
                  animate={{
                    y: "110vh",
                    rotate: piece.rotation + 720,
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    delay: piece.delay,
                    ease: "linear",
                  }}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{ backgroundColor: piece.color }}
                />
              ))}
            </div>
          )}

          {/* Success content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center text-center px-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 10 }}
              className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.4, damping: 10 }}
              >
                <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              {title}
            </motion.h2>

            {message && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-gray-600"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Animacion de checkmark simple para usar inline
 */
interface CheckmarkAnimationProps {
  show: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CheckmarkAnimation({
  show,
  size = "md",
  className,
}: CheckmarkAnimationProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn(
            "rounded-full bg-emerald-100 flex items-center justify-center",
            sizeClasses[size],
            className
          )}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="w-2/3 h-2/3 text-emerald-500"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <motion.path
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Bounce animation para llamar la atencion
 */
interface BounceAnimationProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

export function BounceAnimation({
  children,
  trigger = true,
  className,
}: BounceAnimationProps) {
  return (
    <motion.div
      animate={trigger ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
