import { cn } from '@/lib/utils';

interface WorkflowCardProps {
  className?: string;
}

export function WorkflowCard({ className }: WorkflowCardProps) {
  return (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-xl border border-violet-100 dark:border-violet-900/30', className)}>
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Workflow Card</h3>
      <p className="text-xs text-gray-400 mt-1">Workflow card placeholder</p>
    </div>
  );
}
