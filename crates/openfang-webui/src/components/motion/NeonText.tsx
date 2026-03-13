import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeonTextProps {
  children: React.ReactNode;
  className?: string;
  color?: 'cyan' | 'amber' | 'magenta' | 'green';
  flicker?: boolean;
}

const colorMap = {
  cyan: 'var(--neon-cyan)',
  amber: 'var(--neon-amber)',
  magenta: 'var(--neon-magenta)',
  green: 'var(--neon-green)',
};

export function NeonText({
  children,
  className,
  color = 'cyan',
  flicker = false,
}: NeonTextProps) {
  const neonColor = colorMap[color];

  return (
    <motion.span
      className={cn(className)}
      style={{
        color: neonColor,
        textShadow: `0 0 10px ${neonColor}80, 0 0 20px ${neonColor}40, 0 0 40px ${neonColor}20`,
      }}
      animate={
        flicker
          ? {
              opacity: [1, 0.8, 1, 0.9, 1],
              textShadow: [
                `0 0 10px ${neonColor}80, 0 0 20px ${neonColor}40`,
                `0 0 5px ${neonColor}40, 0 0 10px ${neonColor}20`,
                `0 0 10px ${neonColor}80, 0 0 20px ${neonColor}40`,
                `0 0 8px ${neonColor}60, 0 0 15px ${neonColor}30`,
                `0 0 10px ${neonColor}80, 0 0 20px ${neonColor}40`,
              ],
            }
          : {}
      }
      transition={
        flicker
          ? {
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: 5,
              times: [0, 0.1, 0.2, 0.3, 1],
            }
          : {}
      }
    >
      {children}
    </motion.span>
  );
}
