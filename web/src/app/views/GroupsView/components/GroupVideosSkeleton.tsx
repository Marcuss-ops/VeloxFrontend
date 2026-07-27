/**
 * GroupVideosSkeleton — neutral pulse placeholders rendered while the
 * BFF /api/v1/groups/{group_id}/youtube/videos call is in-flight.
 *
 * Six cards in a 1/2/3-column responsive grid mirror the real grid's
 * layout so the transition from loading → loaded does not reflow.
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SKELETON_CARDS = 6;

export const GroupVideosSkeleton: React.FC = () => {
    return (
        <div
            className={cn(
                'grid gap-4',
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            )}
            aria-busy="true"
            aria-label='Caricamento video del gruppo in corso'
        >
            {Array.from({ length: SKELETON_CARDS }).map((_, idx) => (
                <Card
                    key={`gvs-skeleton-${idx}`}
                    className="overflow-hidden border-white/10 bg-slate-900/40"
                >
                    <div className="aspect-video w-full animate-pulse bg-white/5" />
                    <div className="space-y-2 p-4">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                        <div className="mt-3 flex items-center justify-between">
                            <div className="h-5 w-20 animate-pulse rounded-full bg-white/5" />
                            <div className="h-8 w-32 animate-pulse rounded-md bg-white/5" />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default GroupVideosSkeleton;
