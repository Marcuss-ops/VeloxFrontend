import React from 'react';
import { useJobDeliveries } from '@/hooks/useJobDeliveries';
import { isDeliveryPublished } from '@/lib/api/deliveriesApi';

interface DeliveryOutputCellProps {
    jobId: string;
}

export const DeliveryOutputCell: React.FC<DeliveryOutputCellProps> = ({ jobId }) => {
    const { deliveries, isLoading, isError } = useJobDeliveries(jobId);

    if (isLoading) {
        return <span className="text-text-secondary text-xs animate-pulse">Caricamento...</span>;
    }

    if (isError) {
        return null;
    }

    const published = deliveries.filter((d) => isDeliveryPublished(d.status) && d.platformUrl);

    if (published.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            {published.map((delivery) => (
                <a
                    key={delivery.id}
                    href={delivery.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-600/10 text-red-500 rounded text-xs hover:bg-red-600/20"
                >
                    <span className="material-symbols-rounded text-[14px]">videocam</span> Video
                </a>
            ))}
        </div>
    );
};
