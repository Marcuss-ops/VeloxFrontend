/**
 * DriveFolderBreadcrumbs Component
 * Pure presentational component for Drive folder navigation breadcrumbs
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { BreadcrumbItem } from '../../hooks/useDriveFolderBrowser';

export interface DriveFolderBreadcrumbsProps {
  /** Breadcrumb items */
  breadcrumbs: BreadcrumbItem[];
  /** Navigate to breadcrumb handler */
  onNavigate: (index: number) => void;
}

export const DriveFolderBreadcrumbs: React.FC<DriveFolderBreadcrumbsProps> = ({
  breadcrumbs,
  onNavigate,
}) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          )}
          <button
            onClick={() => onNavigate(index)}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              index === breadcrumbs.length - 1
                ? 'bg-red-500/15 text-red-300 font-medium'
                : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            {index === 0 ? (
              <span className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                {crumb.name}
              </span>
            ) : (
              crumb.name
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default DriveFolderBreadcrumbs;
