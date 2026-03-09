import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/client';
import type { Approval } from '@/api/types';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function for time ago
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
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function Approvals() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const { data: approvals = [], isLoading, error, refetch } = useQuery<Approval[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res = await api.get<{ approvals: Approval[] }>('/api/approvals');
      return res.approvals || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/approvals/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/approvals/${id}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const pendingCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'pending').length;
  }, [approvals]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return approvals;
    // Map 'rejected' filter to 'denied' status in data
    if (filterStatus === 'rejected') return approvals.filter((a) => a.status === 'denied');
    return approvals.filter((a) => a.status === filterStatus);
  }, [approvals, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-500/10">
            <Clock className="h-3 w-3 mr-1" />
            pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">
            <CheckCircle className="h-3 w-3 mr-1" />
            approved
          </Badge>
        );
      case 'denied':
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 bg-red-500/10">
            <XCircle className="h-3 w-3 mr-1" />
            {status === 'denied' ? 'denied' : 'rejected'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const FilterPill = ({ status, label }: { status: FilterStatus; label: string }) => (
    <button
      onClick={() => setFilterStatus(status)}
      className={cn(
        'px-3 py-1.5 text-sm rounded-full border transition-colors',
        filterStatus === status
          ? 'bg-primary text-primary-foreground border-primary'
          : 'hover:bg-muted border-border'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Execution Approvals</h1>
            <p className="text-muted-foreground">Review and approve agent actions</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-500/10">
                <AlertCircle className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive mb-2">{error.message || 'Could not load approvals.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <FilterPill status="all" label="All" />
              <FilterPill status="pending" label="Pending" />
              <FilterPill status="approved" label="Approved" />
              <FilterPill status="rejected" label="Rejected" />
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-12 border rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">No approvals</h4>
                <p className="text-sm text-muted-foreground">
                  When agents request permission for sensitive actions, they&apos;ll appear here.
                </p>
              </div>
            )}

            {/* Approval Cards Grid */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((approval) => (
                  <Card
                    key={approval.id}
                    className={cn(
                      'transition-colors',
                      approval.status === 'approved' && 'border-green-500/50 bg-green-500/5',
                      approval.status === 'denied' && 'border-red-500/50 bg-red-500/5'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base truncate pr-2">
                          {approval.action || approval.action_summary || 'Unknown Action'}
                        </CardTitle>
                        {getStatusBadge(approval.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {approval.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Agent: <span className="font-medium">{approval.agent_name || approval.agent_id.slice(0, 8)}</span>
                        {' · '}
                        <span>{timeAgo(approval.created_at)}</span>
                      </div>

                      {/* Approval Actions for Pending */}
                      {approval.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(approval.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => rejectMutation.mutate(approval.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Approvals;
