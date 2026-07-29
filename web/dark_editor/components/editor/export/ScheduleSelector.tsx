'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';

// ─── Europe/Rome timezone helpers ───────────────────────────────────

/** Returns the current Europe/Rome offset and DST label. */
function getRomeTZ(): { offsetMinutes: number; label: string; abbr: string } {
  const now = new Date();
  const year = now.getFullYear();
  // EU DST: last Sunday of March (02:00 CET → 03:00 CEST)
  //          last Sunday of October (03:00 CEST → 02:00 CET)
  const marLast = new Date(year, 2, 31 - new Date(year, 2, 31).getDay());
  const octLast = new Date(year, 9, 31 - new Date(year, 9, 31).getDay());
  marLast.setHours(2, 0, 0, 0);
  octLast.setHours(3, 0, 0, 0);
  const isDST = now >= marLast && now < octLast;
  const offsetMinutes = isDST ? 120 : 60;
  const abbr = isDST ? 'CEST' : 'CET';
  const label = `Europe/Rome (${abbr}, UTC${isDST ? '+2' : '+1'})`;
  return { offsetMinutes, label, abbr };
}

/** Returns true when the user-supplied local datetime is in the past. */
export function isScheduleInPast(localDateTime: string): boolean {
  if (!localDateTime) return false;
  const d = new Date(localDateTime);
  if (isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

/** Converts a `datetime-local` value to a UTC ISO-8601 string. */
export function localToUTC(localDateTime: string): string {
  const d = new Date(localDateTime);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

export interface ScheduleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * ScheduleSelector — date/time picker for the Dark Editor's publish
 * panel. Uses a native datetime-local input with Europe/Rome timezone
 * indicator, past-date validation, and DST note.
 *
 * Pure presentational: takes the current publishAt string and an
 * onChange handler. The parent ExportDialog owns the FormState.
 */
export function ScheduleSelector({ value, onChange }: ScheduleSelectorProps) {
  const tz = getRomeTZ();
  const inPast = isScheduleInPast(value);
  const hasValidSchedule = value.length > 0 && !inPast;
  const utcPreview = hasValidSchedule ? localToUTC(value) : null;

  // Format the scheduled date for display
  const scheduleDate = hasValidSchedule ? new Date(value) : null;
  const scheduleLabel = scheduleDate
    ? scheduleDate.toLocaleString('it-IT', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : '';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Programmazione pubblicazione</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Lascia vuoto per pubblicare subito. Imposta una data futura per
        programmare la pubblicazione — il video resterà privato fino
        all&apos;orario scelto, poi diventerà pubblico automaticamente.
      </p>

      {/* Timezone indicator */}
      <div className="flex items-center gap-2 rounded-md bg-blue-500/[0.08] border border-blue-500/20 px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-blue-300">
          🕐 Fuso orario: {tz.label}
        </span>
      </div>

      {/* Datetime-local input */}
      <div>
        <label
          htmlFor="publish-schedule-at"
          className="block text-xs font-medium text-muted-foreground mb-1.5"
        >
          Data e ora di pubblicazione
        </label>
        <input
          id="publish-schedule-at"
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-0.5 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
            inPast
              ? 'border-red-500/40 focus:border-red-500/60'
              : 'border-border focus:border-primary'
          }`}
        />
        {inPast && (
          <p className="mt-1 text-xs text-red-400" role="alert">
            La data di pubblicazione deve essere nel futuro.
          </p>
        )}
        {hasValidSchedule && utcPreview && (
          <p className="mt-1 text-xs text-muted-foreground">
            📅 {scheduleLabel}
            {' · '}
            UTC: {utcPreview}
          </p>
        )}
      </div>

      {/* DST note */}
      <p className="text-[10px] text-muted-foreground/60">
        L&apos;ora legale viene gestita automaticamente. Inserisci
        l&apos;orario come lo vedi sull&apos;orologio in Italia — il sistema
        converte in UTC.
      </p>
    </div>
  );
}

export default ScheduleSelector;
