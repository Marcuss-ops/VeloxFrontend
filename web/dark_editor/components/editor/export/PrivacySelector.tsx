'use client';

import React from 'react';
import { PRIVACY_OPTIONS, type PrivacyStatus } from './constants';

export interface PrivacySelectorProps {
  value: PrivacyStatus;
  onChange: (value: PrivacyStatus) => void;
}

/**
 * PrivacySelector \u2014 the canonical visibility radio group for the
 * YouTube publish flow. Pure presentational component: takes the
 * current PrivacyStatus and an onChange handler, renders the three
 * YouTube privacy options (public / unlisted / private) as a single
 * radiogroup with per-option icon + label + description.
 *
 * The PRIVACY_OPTIONS list (label + description + icon per option)
 * is owned by ./constants to keep the icon imports static \u2014 no
 * per-render icon allocation. The selector is read against the
 * `aria-checked` / `role="radio"` contract so screen readers
 * announce the selected state correctly.
 *
 * No state lives here; the parent ExportDialog owns the form
 * state and the FormState.privacyStatus field.
 */
export function PrivacySelector({ value, onChange }: PrivacySelectorProps) {
  return (
    <div>
      <span className="text-sm font-medium">Visibilit\u00e0 finale</span>
      <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup">
        {PRIVACY_OPTIONS.map(({ value: optValue, label, description, icon: Icon }) => {
          const selected = value === optValue;
          return (
            <button
              key={optValue}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optValue)}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">
                  {description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PrivacySelector;
