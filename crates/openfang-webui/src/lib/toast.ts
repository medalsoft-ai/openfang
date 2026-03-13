// Toast Notification System — aligned with Alpine OpenFangToast
export type ToastType = 'success' | 'error' | 'warn' | 'info';

const DEFAULT_DURATION = 4000;

// Toast container element
let toastContainer: HTMLDivElement | null = null;
let toastId = 0;
const activeToasts = new Map<number, HTMLDivElement>();

// Icon SVGs
const icons: Record<ToastType, string> = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-magenta)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  warn: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`,
};

const borderColors: Record<ToastType, string> = {
  success: 'border-[var(--neon-green)]/30',
  error: 'border-[var(--neon-magenta)]/30',
  warn: 'border-[var(--neon-amber)]/30',
  info: 'border-[var(--neon-cyan)]/30',
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-[var(--neon-green)]/10',
  error: 'bg-[var(--neon-magenta)]/10',
  warn: 'bg-[var(--neon-amber)]/10',
  info: 'bg-[var(--neon-cyan)]/10',
};

function getContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container') as HTMLDivElement;
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

function createToastElement(message: string, type: ToastType, onClose: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `
    pointer-events-auto
    min-w-[280px] max-w-[400px]
    flex items-start gap-3
    px-4 py-3 rounded-lg
    border ${borderColors[type]}
    ${bgColors[type]}
    backdrop-blur-sm
    shadow-[0_4px_20px_rgba(0,0,0,0.3)]
    transition-all duration-200
  `;

  el.innerHTML = `
    <div class="flex-shrink-0 mt-0.5">${icons[type]}</div>
    <span class="flex-1 text-sm text-[var(--text-primary)] font-mono leading-relaxed">${message}</span>
    <button class="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors toast-close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
  });

  // Close button
  el.querySelector('.toast-close')?.addEventListener('click', onClose);

  return el;
}

function dismissToast(id: number) {
  const el = activeToasts.get(id);
  if (!el || el.dataset.dismissing === 'true') return;

  el.dataset.dismissing = 'true';
  el.style.opacity = '0';
  el.style.transform = 'translateX(20px)';

  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
    activeToasts.delete(id);
  }, 200);
}

export function toast(message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION): number {
  const id = ++toastId;
  const container = getContainer();

  const el = createToastElement(message, type, () => dismissToast(id));
  container.appendChild(el);
  activeToasts.set(id, el);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

// Convenience functions
export function toastSuccess(message: string, duration?: number) {
  return toast(message, 'success', duration);
}

export function toastError(message: string, duration?: number) {
  return toast(message, 'error', duration || 6000);
}

export function toastWarn(message: string, duration?: number) {
  return toast(message, 'warn', duration || 5000);
}

export function toastInfo(message: string, duration?: number) {
  return toast(message, 'info', duration);
}

// Export as object (like Alpine OpenFangToast)
export const toaster = {
  toast,
  success: toastSuccess,
  error: toastError,
  warn: toastWarn,
  info: toastInfo,
};

export default toaster;
