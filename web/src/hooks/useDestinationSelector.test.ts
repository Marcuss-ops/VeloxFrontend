import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDestinationSelector } from './useDestinationSelector';
import { accountsApi } from '@/lib/api/accountsApi';
import { socialDestinationsApi } from '@/lib/api/socialDestinationsApi';
import { authApi } from '@/lib/api/authApi';

vi.mock('@/lib/api/accountsApi');
vi.mock('@/lib/api/socialDestinationsApi');
vi.mock('@/lib/api/authApi');

describe('useDestinationSelector', () => {
  const mockGetMe = vi.mocked(authApi.getMe);
  const mockListAccounts = vi.mocked(accountsApi.listAccounts);
  const mockListDestinations = vi.mocked(socialDestinationsApi.list);
  const mockCreateDestination = vi.mocked(socialDestinationsApi.create);

  beforeEach(() => {
    mockGetMe.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      workspaceId: 7,
      isAdmin: false,
    });
    mockListAccounts.mockResolvedValue({
      accounts: [
        { id: 101, platform: 'youtube', username: 'Channel A', status: 'active' },
        { id: 102, platform: 'youtube', username: 'Channel B', status: 'active' },
      ],
    });
    mockListDestinations.mockResolvedValue({
      destinations: [
        {
          external_destination_id: 'extdst_001',
          platform_account_id: 101,
          status: 'active',
          label: 'Channel A',
          provider: 'youtube',
          source_system: 'youtube',
          defaults: { privacy_status: 'private', language: 'en' },
        },
      ],
    });
    mockCreateDestination.mockResolvedValue({
      external_destination_id: 'extdst_002',
      status: 'active',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads YouTube accounts and destinations, joining them by platform_account_id', async () => {
    const { result } = renderHook(() => useDestinationSelector());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].account.username).toBe('Channel A');
    expect(result.current.accounts[0].destination).not.toBeNull();
    expect(result.current.accounts[0].destination?.external_destination_id).toBe('extdst_001');
    expect(result.current.accounts[1].destination).toBeNull();
  });

  it('selects an existing destination immediately', async () => {
    const { result } = renderHook(() => useDestinationSelector());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const onChange = vi.fn();
    await act(async () => {
      await result.current.selectOrCreateDestination(101, onChange);
    });

    expect(onChange).toHaveBeenCalledWith('extdst_001');
    expect(mockCreateDestination).not.toHaveBeenCalled();
  });

  it('creates a destination for an unlinked account and selects it', async () => {
    const { result } = renderHook(() => useDestinationSelector());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const onChange = vi.fn();
    await act(async () => {
      await result.current.selectOrCreateDestination(102, onChange);
    });

    expect(mockCreateDestination).toHaveBeenCalledWith({
      workspace_id: 7,
      platform_account_id: 102,
      defaults: { privacy_status: 'private', language: 'en' },
    });
    expect(mockListDestinations).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith('extdst_002');
  });

  it('surfaces an error when not authenticated', async () => {
    mockGetMe.mockResolvedValue(null);

    const { result } = renderHook(() => useDestinationSelector());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Not authenticated');
    expect(result.current.accounts).toHaveLength(0);
  });

  it('clears creatingAccountId after creation finishes', async () => {
    const { result } = renderHook(() => useDestinationSelector());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.selectOrCreateDestination(102, vi.fn());
    });

    expect(result.current.creatingAccountId).toBeNull();
  });
});
