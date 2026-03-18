import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

/**
 * Wrapper around useQuery that automatically waits for authReady before fetching.
 * Use this for all API queries that require authentication.
 * The 'enabled' option is combined with authReady - query only runs when both are true.
 */
export function useAuthQuery<TData>(
  options: UseQueryOptions<TData, Error, TData, readonly unknown[]>
) {
  const { authReady } = useAuthStore();

  return useQuery<TData, Error, TData>({
    ...options,
    enabled: authReady && (options.enabled !== undefined ? options.enabled : true),
  });
}

/**
 * Hook to get the authReady state and queryClient for manual query management.
 */
export function useAuthQueryClient() {
  const { authReady } = useAuthStore();
  const queryClient = useQueryClient();
  return { authReady, queryClient };
}
