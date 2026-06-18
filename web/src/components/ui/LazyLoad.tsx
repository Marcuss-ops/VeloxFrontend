/**
 * LazyLoad Component
 * 
 * Lazy loads heavy components with optional loading indicator.
 * Use for modals, large lists, and expensive UI sections.
 * 
 * @example
 * ```tsx
 * const YouTubeChannelsApp = lazyLoad(() => import('./YouTubeChannelsApp'));
 * 
 * // In render
 * <LazyLoad component={YouTubeChannelsApp} />
 * ```
 */

import React, { Suspense, lazy, ComponentType } from 'react';

export interface LazyLoadProps<P extends Record<string, unknown> = Record<string, never>> {
  /** Dynamic import function */
  importFn: () => Promise<{ default: ComponentType<P> }>;
  /** Loading fallback component */
  fallback?: React.ReactNode;
  /** Props to pass to the loaded component */
  componentProps?: P;
}

/**
 * Lazy load a component with optional loading state
 */
export function LazyLoad<P extends Record<string, unknown> = Record<string, never>>({
  importFn,
  fallback,
  componentProps,
}: LazyLoadProps<P>) {
  const LazyComponent = lazy(importFn);
  const props = (componentProps ?? {}) as P;

  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Default loading fallback
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
    </div>
  );
}

/**
 * Create a lazy-loaded component
 * 
 * @param importFn - Dynamic import function
 * @param FallbackComponent - Optional loading component
 * @returns Lazy-loaded component
 * 
 * @example
 * ```tsx
 * const LazyYouTubeChannelsApp = createLazyComponent(
 *   () => import('./YouTubeChannelsApp'),
 *   LoadingSpinner
 * );
 * 
 * // Use in render
 * <LazyYouTubeChannelsApp {...props} />
 * ```
 */
export function createLazyComponent<P extends Record<string, unknown> = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  FallbackComponent: ComponentType = DefaultLoadingFallback
): React.FC<P> {
  const LazyComponent = lazy(importFn);

  return function LazyComponentWrapper(props: P) {
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy Modal
 * 
 * Loads modal content only when it's open.
 * Great for heavy modals with forms, lists, or complex UI.
 * 
 * @example
 * ```tsx
 * <LazyModal
 *   isOpen={isModalOpen}
 *   importFn={() => import('./HeavyModal')}
 *   onClose={() => setIsModalOpen(false)}
 * />
 * ```
 */
export interface LazyModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Dynamic import function */
  importFn: () => Promise<{ default: ComponentType<any> }>;
  /** Close handler */
  onClose: () => void;
  /** Props to pass to modal */
  modalProps?: Record<string, any>;
}

export const LazyModal: React.FC<LazyModalProps> = ({
  isOpen,
  importFn,
  onClose,
  modalProps = {},
}) => {
  if (!isOpen) return null;

  const LazyComponent = lazy(importFn);

  return (
    <Suspense fallback={<DefaultLoadingFallback />}>
      <LazyComponent onClose={onClose} {...modalProps} />
    </Suspense>
  );
};

export default LazyLoad;
