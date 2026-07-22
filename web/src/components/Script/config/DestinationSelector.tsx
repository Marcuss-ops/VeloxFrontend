import React, { useMemo } from 'react';
import { useDestinationSelector } from '@/hooks/useDestinationSelector';

export interface DestinationSelectorProps {
  /** Currently selected external_destination_id. */
  selectedId: string | null;
  /** Called when the user selects a destination. */
  onChange: (externalDestinationId: string) => void;
  /** Optional label for the selector section. */
  label?: string;
}

/**
 * DestinationSelector - Pick a YouTube account to publish to.
 *
 * Shows the user's connected YouTube platform accounts. If an account already
 * has a Velox social destination, selecting it passes the opaque
 * external_destination_id to the generation flow. If it doesn't, the selector
 * creates the destination on demand and then selects it.
 */
export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  selectedId,
  onChange,
  label = 'Destinazione YouTube',
}) => {
  const {
    accounts,
    loading,
    error,
    creatingAccountId,
    refetch,
    selectOrCreateDestination,
  } = useDestinationSelector();

  const activeCount = useMemo(
    () => accounts.filter(({ destination }) => destination?.status === 'active').length,
    [accounts]
  );

  const isBusy = loading || creatingAccountId !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium tracking-wide">
        <span className="material-symbols-outlined text-[15px]">video_library</span>
        <span>{label}</span>
        {!loading && (
          <span className="text-slate-600">
            ({activeCount} {activeCount === 1 ? 'collegata' : 'collegate'})
          </span>
        )}
      </div>

      {loading && (
        <div className="text-xs text-slate-500 font-medium">
          Caricamento account YouTube...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between gap-2 text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isBusy}
            className="text-xs font-medium text-red-300 hover:text-red-100 underline disabled:opacity-50"
          >
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="text-xs text-slate-500">
          Nessun account YouTube collegato. Collega un account nelle impostazioni social.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {accounts.map(({ account, destination }) => {
          const isSelected = destination?.external_destination_id === selectedId;
          const isCreating = creatingAccountId === account.id;
          const isActive = destination?.status === 'active';
          const displayName = destination?.label || account.username || `Account ${account.id}`;

          return (                <button
                  key={account.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectOrCreateDestination(account.id, onChange)}
                  disabled={isBusy}
                  title={
                    isActive
                      ? `Pubblica su ${displayName}`
                      : `Crea destinazione per ${displayName}`
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'bg-slate-200 text-slate-900 border-slate-100'
                  : 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-white/20 hover:bg-slate-800/70'
              } ${isBusy ? 'opacity-70 cursor-wait' : ''}`}
                >

              <span className="material-symbols-outlined text-[14px]">
                {isActive ? 'video_library' : 'add_link'}
              </span>
              <span className="text-[11px] font-semibold tracking-wide">{displayName}</span>
              {!isActive && !isCreating && (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                  NUOVO
                </span>
              )}
              {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
              {isCreating && (
                <span className="material-symbols-outlined animate-spin text-[14px]">
                  sync
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DestinationSelector;
