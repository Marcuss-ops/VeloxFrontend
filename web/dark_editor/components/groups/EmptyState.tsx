import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">{icon}</div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
