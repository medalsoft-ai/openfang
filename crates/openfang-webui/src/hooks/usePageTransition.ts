import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

export function usePageTransition() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location !== displayLocation) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [location, displayLocation]);

  return { isTransitioning, displayLocation };
}
