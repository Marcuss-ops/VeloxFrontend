import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useJobDeliveries } from '@/hooks/useJobDeliveries';
import { isDeliveryPublished, isDeliveryFailed } from '@/lib/api/deliveriesApi';
import { categorizeYouTubeError, getYouTubeFailureLabel } from './jobUtils';

interface DeliveryStatusCellProps {
    jobId: string;
}

export const DeliveryStatusCell: React.FC<DeliveryStatusCellProps> = ({ jobId }) => {
    const { deliveries, isLoading, isError, error } = useJobDeliveries(jobId);

    if (isLoading) {
        return <span className="text-muted-foreground text-xs animate-pulse">Caricamento...</span>;
    }

    if (isError) {
        return (
            <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold cursor-help"
                title={error?.message ?? 'Errore caricamento consegne'}
            >
                <AlertCircle className="size-12 text-red-400" /> Errore
            </span>
        );
    }

    if (deliveries.length === 0) {
        return <span className="text-muted-foreground text-xs">Nessuna consegna</span>;
    }

    return (
        <div className="flex items-center flex-wrap gap-2">
            {deliveries.map((delivery) => {
                const { status, lastErrorMessage } = delivery;
                const published = isDeliveryPublished(status);
                const failed = isDeliveryFailed(status);

                if (published) {
                    return (
                        <span
                            key={delivery.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold uppercase"
                        >
                            <CheckCircle2 className="size-5 text-green-400" /> Pubblicato
                        </span>
                    );
                }

                if (failed) {
                    const errorInfo = categorizeYouTubeError(lastErrorMessage ?? undefined);
                    const label = getYouTubeFailureLabel(lastErrorMessage ?? undefined);
                    return (
                        <span
                            key={delivery.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold cursor-help relative group/yt"
                            title={lastErrorMessage ?? 'Pubblicazione fallita'}
                        >
                            <errorInfo.icon className="size-3.5" style={{ color: `var(--color-${errorInfo.color}-400)` }} />
                            Video: {label}
                            <span className="hidden group-hover/yt:block absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-72 px-3 py-2 bg-card border border rounded-lg text-[11px] text-foreground/80 shadow-xl whitespace-normal pointer-events-none">
                                <div className="font-bold text-red-400 mb-1">{errorInfo.hint}</div>
                                <div className="text-foreground/70 break-words">{lastErrorMessage}</div>
                            </span>
                        </span>
                    );
                }

                return (
                    <span
                        key={delivery.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase"
                    >
                        <span className="material-symbols-rounded text-[12px]">hourglass_empty</span>
                        {status}
                    </span>
                );
            })}
        </div>
    );
};
