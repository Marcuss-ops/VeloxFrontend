/**
 * ContentDashboard — /content home page.
 *
 * Entry point for the InstaEdit content area.
 * Shows recent content, quick actions, and a "New Content" button.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { SquarePen, Plus, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { APP_ROUTES } from '@/app/routes';

export const ContentDashboard: React.FC = () => {
    return (
        <div className="space-y-8">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:from-purple-500 hover:to-violet-500 transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]"
                >
                    <Plus className="size-4" />
                    Nuovo contenuto
                </Link>
            </div>

            {/* Empty state */}
            <Card className="border-dashed border-white/10 bg-white/[0.02] backdrop-blur-none">
                <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-purple-500/20">
                            <SquarePen className="size-9 text-purple-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                            <Sparkles className="size-3.5 text-purple-300" />
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-200">Nessun contenuto</h2>
                    <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
                        Crea il tuo primo contenuto per iniziare a generare video con InstaEdit.
                    </p>
                    <Link
                        to={`${APP_ROUTES.content}/new`}
                        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-violet-600/20 px-5 py-2.5 text-sm font-medium text-purple-300 hover:from-purple-600/30 hover:to-violet-600/30 transition-all border border-purple-500/20 hover:border-purple-500/30"
                    >
                        <Plus className="size-4" />
                        Crea ora
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentDashboard;
