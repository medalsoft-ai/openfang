import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const styles = {
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
  success: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
};

export function Toast({ toast, onClose }: ToastProps) {
  const Icon = icons[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-[400px] animate-in slide-in-from-right-full ${styles[toast.type]}`}
      role="alert"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ '--tw-hover-opacity': '0.05' } as React.CSSProperties}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}
