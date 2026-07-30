/**
 * ContentDashboard — /content home page.
 *
 * Entry point for the InstaEdit content area.
 * Shows recent content, quick actions, and a "New Content" button.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '@/app/routes';

export const ContentDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Contenuti</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Crea e gestisci i tuoi contenuti video
                    </p>
                </div>
                <Link
                    to={`${APP_ROUTES.content}/new`}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    Nuovo contenuto
                </Link>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
                <span className="material-symbols-rounded text-5xl text-slate-600">edit_square</span>
                <h2 className="mt-4 text-lg font-medium text-slate-300">Nessun contenuto</h2>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                    Crea il tuo primo contenuto per iniziare a generare video con InstaEdit.
                </p>
                <Link
                    to={`${APP_ROUTES.content}/new`}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600/20 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-600/30 transition-colors"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    Crea ora
                </Link>
            </div>
        </div>
    );
};

export default ContentDashboard;
