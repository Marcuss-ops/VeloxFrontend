/**
 * ScriptWorkspace — /content/:contentId/script
 *
 * Script editing and generation workspace.
 * Placeholder until full integration with useScriptGenerator is complete.
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { APP_ROUTES } from '@/app/routes';

export const ScriptWorkspace: React.FC = () => {
    const { contentId } = useParams<{ contentId: string }>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to={`${APP_ROUTES.content}/${contentId}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <span className="material-symbols-rounded text-lg">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Script</h1>
                    <p className="mt-1 text-sm text-slate-400">Generazione e modifica script</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
                <span className="material-symbols-rounded text-5xl text-slate-600">article</span>
                <h2 className="mt-4 text-lg font-medium text-slate-300">Script Workspace</h2>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                    L&apos;editor di script sarà disponibile a breve con generazione AI integrata.
                </p>
            </div>
        </div>
    );
};

export default ScriptWorkspace;
