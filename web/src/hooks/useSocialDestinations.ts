import { useCallback, useEffect, useState } from 'react';
import { listSocialDestinations, type SocialDestination } from '@/lib/api/socialDestinationsApi';
import { getMe } from '@/lib/api/authApi';

export interface UseSocialDestinationsReturn {
  destinations: SocialDestination[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSocialDestinations({ enabled = true }: { enabled?: boolean } = {}): UseSocialDestinationsReturn {
  const [destinations, setDestinations] = useState<SocialDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      if (!me) {
        setError('Not authenticated');
        setDestinations([]);
        return;
      }
      const response = await listSocialDestinations(me.workspaceId);
      setDestinations(response.destinations ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load destinations';
      setError(message);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchDestinations();
  }, [fetchDestinations, enabled]);

  return {
    destinations,
    loading,
    error,
    refetch: fetchDestinations,
  };
}
