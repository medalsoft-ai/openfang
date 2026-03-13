import { useRef, useEffect, useState } from 'react';

interface KineticScrollOptions {
  friction?: number;
  velocityThreshold?: number;
}

export function useKineticScroll(options: KineticScrollOptions = {}) {
  const { friction = 0.95, velocityThreshold = 0.5 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let velocity = 0;
    let rafId: number;
    let isDragging = false;
    let startY = 0;
    let scrollTop = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      velocity += e.deltaY * 0.5;
      setIsScrolling(true);

      const animate = () => {
        if (Math.abs(velocity) > velocityThreshold) {
          container.scrollTop += velocity;
          velocity *= friction;
          rafId = requestAnimationFrame(animate);
        } else {
          velocity = 0;
          setIsScrolling(false);
        }
      };

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startY = e.clientY;
      scrollTop = container.scrollTop;
      velocity = 0;
      cancelAnimationFrame(rafId);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = startY - e.clientY;
      container.scrollTop = scrollTop + delta;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafId);
    };
  }, [friction, velocityThreshold]);

  return { containerRef, isScrolling };
}
