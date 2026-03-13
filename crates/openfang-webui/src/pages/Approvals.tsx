// Approvals - Security Checkpoint Style
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cyberColors } from '@/lib/animations';
import {
  Shield, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  Loader2, Search, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Approval {
  id: string;
  action?: string;
  action_summary?: string;
  description?: string;
  status: 'pending' | 'approved' | 'denied' | 'rejected';
  agent_id: string;
  agent_name?: string;
  created_at: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Status badge with security colors
function StatusBadge({ status }: { status: string }) {
  const configs = {
    pending: { color: 'var(--neon-amber)', bg: 'rgba(255, 184, 0, 0.15)', icon: Clock },
    approved: { color: 'var(--neon-green)', bg: 'rgba(0, 255, 136, 0.15)', icon: CheckCircle },
    denied: { color: 'var(--neon-magenta)', bg: 'rgba(255, 0, 110, 0.15)', icon: XCircle },
    rejected: { color: 'var(--neon-magenta)', bg: 'rgba(255, 0, 110, 0.15)', icon: XCircle },
  };

  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// Approval card with security scan effect
function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isPending
}: {
  approval: Approval;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const isPendingStatus = approval.status === 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <SpotlightCard
        glowColor={
          approval.status === 'approved' ? 'rgba(0, 255, 136, 0.1)' :
          approval.status === 'denied' || approval.status === 'rejected' ? 'rgba(255, 0, 110, 0.1)' :
          'rgba(255, 184, 0, 0.1)'
        }
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: isPendingStatus ? 'rgba(255, 184, 0, 0.15)' : 'var(--surface-tertiary)'
                }}
              >
                <Shield
                  className="w-5 h-5"
                  style={{ color: isPendingStatus ? 'var(--neon-amber)' : 'var(--text-muted)' }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                  {approval.action || approval.action_summary || 'Unknown Action'}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {approval.agent_name || approval.agent_id.slice(0, 8)} • {timeAgo(approval.created_at)}
                </p>
              </div>
            </div>
            <StatusBadge status={approval.status} />
          </div>

          {/* Description */}
          {approval.description && (
            <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
              {approval.description}
            </p>
          )}

          {/* Security scan line animation for pending */}
          {isPendingStatus && (
            <div className="relative h-px bg-[var(--border-default)] mb-4 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 w-20"
                style={{
                  background: 'linear-gradient(90deg, transparent, var(--neon-amber), transparent)'
                }}
                animate={{ left: ['-20%', '120%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}

          {/* Actions */}
          {isPendingStatus && (
            <div className="flex gap-3">
              <motion.button
                onClick={onApprove}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--neon-green)]/10 text-[var(--neon-green)] hover:bg-[var(--neon-green)]/20 font-medium text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </motion.button>
              <motion.button
                onClick={onReject}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/20 font-medium text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </motion.button>
            </div>
          )}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Approvals() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading, error, refetch } = useQuery<Approval[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res = await api.get<{ approvals: Approval[] }>('/api/approvals');
      return res.approvals || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/approvals/${id}/approve`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/approvals/${id}/reject`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  });

  const pendingCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'pending').length;
  }, [approvals]);

  const filtered = useMemo(() => {
    let result = approvals;

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'rejected') {
        result = result.filter((a) => a.status === 'denied' || a.status === 'rejected');
      } else {
        result = result.filter((a) => a.status === filterStatus);
      }
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.action?.toLowerCase().includes(q) ||
           a.action_summary?.toLowerCase().includes(q) ||
           a.description?.toLowerCase().includes(q) ||
           a.agent_name?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [approvals, filterStatus, searchQuery]);

  const filterTabs: { key: FilterStatus; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: approvals.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold">
              <NeonText color="green">Approvals</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {approvals.length} request{approvals.length !== 1 ? 's' : ''} • {pendingCount} pending
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{pendingCount} pending</span>
              </motion.div>
            )}
            <motion.button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
            </motion.button>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          className="flex flex-wrap gap-1 mb-6 bg-[var(--surface-secondary)] rounded-xl p-1 w-fit"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filterStatus === tab.key
                  ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs opacity-60">{tab.count}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          className="relative mb-6 max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--neon-green)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-12 h-12 text-[var(--neon-magenta)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Failed to load</h3>
            <p className="text-[var(--text-muted)] mb-4">{error.message || 'Could not load approvals'}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
            >
              Retry
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {filterStatus === 'all' ? 'No approvals' : `No ${filterStatus} requests`}
            </h3>
            <p className="text-[var(--text-muted)]">
              {searchQuery ? 'Try a different search term' : 'Approval requests will appear here'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={() => approveMutation.mutate(approval.id)}
                  onReject={() => rejectMutation.mutate(approval.id)}
                  isPending={approveMutation.isPending || rejectMutation.isPending}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Approvals;
