import { useCallback, useEffect, useMemo, useState } from 'react';
import { accountsApi, type PlatformAccount } from '@/lib/api/accountsApi';
import {
  socialDestinationsApi,
  type SocialDestination,
} from '@/lib/api/socialDestinationsApi';
import { authApi } from '@/lib/api/authApi';

export interface AccountWithDestination {
  account: PlatformAccount;
  destination: SocialDestination | null;
}

export interface UseDestinationSelectorReturn {
  /** YouTube accounts linked to the current workspace. */
  accounts: AccountWithDestination[];
  /** Raw destinations returned by the BFF. */
  destinations: SocialDestination[];
  /** True while accounts/destinations are loading. */
  loading: boolean;
  /** Current error message, if any. */
  error: string | null;
  /** The account id currently being linked (creating a destination). */
  creatingAccountId: number | null;
  /** Refetch accounts and destinations. */
  refetch: () => Promise<void>;
  /**
   * Select (or create) a destination for the given account and return its
   * external_destination_id through the provided callback. If the account
   * already has a destination, it is selected immediately. Otherwise a new
   * Velox destination is created on demand.
   */
  selectOrCreateDestination: (
    accountId: number,
    onChange: (externalDestinationId: string) => void
  ) => Promise<void>;
}

const DEFAULT_CREATE_DEFAULTS: SocialDestination['defaults'] = {
  privacy_status: 'private',
  language: 'en',
};

/**
 * Hook for selecting the Velox social destination to publish to.
 *
 * Fetches the user's YouTube platform accounts and existing Velox social
 * destinations in parallel. Accounts are joined with their associated
 * destination so the UI can show which accounts are already linked and which
 * still need a destination to be created.
 */
export interface UseDestinationSelectorOptions {
  /** When false, the hook will not fetch data until re-enabled. Defaults to true. */
  enabled?: boolean;
}

export function useDestinationSelector(
  options: UseDestinationSelectorOptions = {}
): UseDestinationSelectorReturn {
  const { enabled = true } = options;
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [destinations, setDestinations] = useState<SocialDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingAccountId, setCreatingAccountId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.getMe();
      if (!me?.workspaceId) {
        setError('Not authenticated');
        setWorkspaceId(null);
        setAccounts([]);
        setDestinations([]);
        return;
      }
      setWorkspaceId(me.workspaceId);
      const [{ accounts: platformAccounts }, { destinations: socialDestinations }] = await Promise.all([
        accountsApi.listAccounts('youtube'),
        socialDestinationsApi.list(me.workspaceId),
      ]);
      setAccounts(platformAccounts.filter((a) => a.platform === 'youtube'));
      setDestinations(socialDestinations);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load destinations';
      setError(message);
      setAccounts([]);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void fetchData();
  }, [fetchData, enabled]);

  const selectOrCreateDestination = useCallback(
    async (accountId: number, onChange: (externalDestinationId: string) => void) => {
      const existing = destinations.find((d) => d.platform_account_id === accountId);
      if (existing) {
        onChange(existing.external_destination_id);
        return;
      }

      if (!workspaceId) {
        setError('Not authenticated');
        return;
      }

      setCreatingAccountId(accountId);
      try {
        const response = await socialDestinationsApi.create({
          workspace_id: workspaceId,
          platform_account_id: accountId,
          defaults: { ...DEFAULT_CREATE_DEFAULTS },
        });

        // Refetch to get the canonical label/defaults/status from the server and avoid
        // duplicate local entries if the user clicks again before the state updates.
        const { destinations: refreshed } = await socialDestinationsApi.list(workspaceId);
        setDestinations(refreshed);
        onChange(response.external_destination_id);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to create destination';
        setError(message);
      } finally {
        setCreatingAccountId(null);
      }
    },
    [destinations, workspaceId]
  );

  const combined = useMemo<AccountWithDestination[]>(() => {
    return accounts.map((account) => ({
      account,
      destination: destinations.find((d) => d.platform_account_id === account.id) || null,
    }));
  }, [accounts, destinations]);

  return {
    accounts: combined,
    destinations,
    loading,
    error,
    creatingAccountId,
    refetch: fetchData,
    selectOrCreateDestination,
  };
}
