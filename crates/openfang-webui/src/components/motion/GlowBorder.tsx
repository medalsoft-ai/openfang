import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlowBorderProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  pulse?: boolean;
}

export function GlowBorder({
  children,
  className,
  glowColor = 'rgba(var(--neon-cyan-rgb, 0, 240, 255), 0.5)',
  pulse = false,
}: GlowBorderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-[1px] rounded-xl"
        style={{
          background: `linear-gradient(90deg, ${glowColor}, transparent, ${glowColor})`,
          backgroundSize: '200% 100%',
        }}
        animate={
          pulse
            ? {
                backgroundPosition: ['0% 50%', '200% 50%'],
                opacity: [0.5, 1, 0.5],
              }
            : {}
        }
        transition={
          pulse
            ? {
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }
            : {}
        }
      />
      {/* Content */}
      <div className="relative z-10 h-full rounded-xl bg-[var(--surface-primary)]">
        {children}
      </div>
    </div>
  );
}
