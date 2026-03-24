import { cn } from '@/lib/utils';

interface WorkflowPanelProps {
  className?: string;
}

export default function WorkflowPanel({ className }: WorkflowPanelProps) {
  return (
    <div className={cn('w-80 h-full bg-white/60 dark:bg-white/5 backdrop-blur-xl border-r border-violet-100 dark:border-violet-900/30 p-4', className)}>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Workflows</h2>
      <p className="text-sm text-gray-400">Workflow panel placeholder</p>
    </div>
  );
}
