/**
 * features/publishing — Publishing feature
 *
 * Social destination management, delivery tracking, and publish workflow.
 */

// Hooks
export { useJobDeliveries } from '@/hooks/useJobDeliveries';
export type { UseJobDeliveriesResult } from '@/hooks/useJobDeliveries';
export { useDestinationSelector } from '@/hooks/useDestinationSelector';
export type {
  UseDestinationSelectorReturn,
  UseDestinationSelectorOptions,
  AccountWithDestination,
} from '@/hooks/useDestinationSelector';

// API
export { deliveriesApi } from '@/lib/api/deliveriesApi';
export type { Delivery } from '@/lib/api/deliveriesApi';
export { socialDestinationsApi } from '@/lib/api/socialDestinationsApi';
export type { SocialDestination } from '@/lib/api/socialDestinationsApi';
