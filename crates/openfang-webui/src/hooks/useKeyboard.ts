import { useEffect, useCallback } from 'react';

interface KeyCombo {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export function useKeyboard(
  handler: (e: KeyboardEvent) => void,
  deps: unknown[] = []
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handler(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, deps);
}

export function useKeyCombo(
  combo: KeyCombo,
  callback: () => void,
  deps: unknown[] = []
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const keyMatch = e.key.toLowerCase() === combo.key.toLowerCase();
    const ctrlMatch = combo.ctrl ? e.ctrlKey : !e.ctrlKey;
    const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey;
    const altMatch = combo.alt ? e.altKey : !e.altKey;
    const metaMatch = combo.meta ? e.metaKey : !e.metaKey;

    if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
      e.preventDefault();
      callback();
    }
  }, [combo, callback]);

  useKeyboard(handleKeyDown, deps);
}

// Common shortcuts
export function useEscapeKey(callback: () => void, deps: unknown[] = []) {
  useKeyCombo({ key: 'Escape' }, callback, deps);
}

export function useEnterKey(callback: () => void, deps: unknown[] = []) {
  useKeyCombo({ key: 'Enter' }, callback, deps);
}

export function useCtrlKey(key: string, callback: () => void, deps: unknown[] = []) {
  useKeyCombo({ key, ctrl: true }, callback, deps);
}
