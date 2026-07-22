import { useCallback, useEffect, useState } from 'react';
import { getMe, listSocialDestinations, type SocialDestination } from '@/lib/api/bff';

export interface UseSocialDestinationsReturn {
  destinations: SocialDestination[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSocialDestinations(): UseSocialDestinationsReturn {
  const [destinations, setDestinations] = useState<SocialDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      const workspaceId = me?.user?.workspace_id;
      if (!workspaceId) {
        setError('Workspace not available');
        setDestinations([]);
        return;
      }
      const response = await listSocialDestinations(workspaceId);
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
    fetchDestinations();
  }, [fetchDestinations]);

  return {
    destinations,
    loading,
    error,
    refetch: fetchDestinations,
  };
}
