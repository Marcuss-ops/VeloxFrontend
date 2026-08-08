// Skeleton components for loading states

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Preview skeleton */}
      <div className="aspect-video bg-muted" />
      
      {/* Info skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-border p-4 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      
      {/* Main canvas skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar skeleton */}
        <div className="h-14 border-b border-border flex items-center px-4 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
        
        {/* Canvas skeleton */}
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <Skeleton className="h-96 w-[600px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-b-2',
    lg: 'h-12 w-12 border-b-2',
  };
  
  return (
    <div className={`rounded-full border-primary ${sizes[size]} animate-spin`} />
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
