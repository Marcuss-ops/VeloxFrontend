/**
 * NewContentWizard — /content/new
 *
 * Wizard for creating a new content project.
 * Placeholder until the full wizard UI is implemented.
 */

import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '@/app/routes';

export const NewContentWizard: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to={APP_ROUTES.content}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="size-[18px] " />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Nuovo contenuto</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Configura un nuovo progetto video
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border bg-white/[0.02] px-6 py-16 text-center">
                <Wrench className="size-12 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-medium text-foreground/70">Wizard in costruzione</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Il wizard di creazione contenuti sarà disponibile a breve.
                </p>
            </div>
        </div>
    );
};

export default NewContentWizard;
