/**
 * PublishView — /content/:contentId/publish
 *
 * Publishing workflow: destination selection, metadata, and final publish.
 * Placeholder until full publishing integration is complete.
 */

import React from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { APP_ROUTES } from '@/app/routes';

export const PublishView: React.FC = () => {
    const { contentId } = useParams<{ contentId: string }>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to={`${APP_ROUTES.content}/${contentId}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="size-[18px] " />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Pubblica</h1>
                    <p className="mt-1 text-sm text-slate-400">Pubblicazione sui social</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
                <Upload className="size-12 text-slate-600" />
                <h2 className="mt-4 text-lg font-medium text-slate-300">Publishing</h2>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                    Il flusso di pubblicazione sarà disponibile a breve.
                </p>
            </div>
        </div>
    );
};

export default PublishView;
