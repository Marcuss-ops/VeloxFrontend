/**
 * GroupVideosEmptyState — friendly CTA banner shown when the group has
 * no private/unlisted/processed videos (every uploaded video is
 * already public, or no upload has reached YouTube yet).
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface GroupVideosEmptyStateProps {
    /** When false, the warning copy is replaced by the no-video copy. */
    hasWarnings: boolean;
    warningCount: number;
    onRetry?: () => void;
}

export const GroupVideosEmptyState: React.FC<GroupVideosEmptyStateProps> = ({
    hasWarnings,
    warningCount,
    onRetry,
}) => {
    return (
        <div
            role="status"
            className={cn(
                'mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border bg-card/60 p-10 text-center',
            )}
        >
            <div className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
                {hasWarnings ? 'YouTube non ha risposto' : 'Nessun video da modificare'}
            </div>
            <h2 className="text-xl font-semibold text-white">
                {hasWarnings
                    ? 'Alcuni canali non hanno risposto'
                    : 'Tutti i video di questo gruppo sono già pronti'}
            </h2>
            <p className="max-w-md text-sm text-foreground/70">
                {hasWarnings
                    ? `${warningCount} canale${warningCount === 1 ? '' : 'i'} su questo gruppo non è riuscito a elencare i propri video privati. Riprova o controlla le credenziali su Instaedit.`
                    : 'Quando importi un video da Drive e YouTube lo marca come "elaborato", comparirà qui pronto per la modifica della copertina.'}
            </p>
            {onRetry && (
                <Button type="button" variant="outline" onClick={onRetry}>
                    Riprova
                </Button>
            )}
        </div>
    );
};

export default GroupVideosEmptyState;
