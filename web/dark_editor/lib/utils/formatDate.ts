export function formatDate(
  value: string | undefined,
  locale: string = 'it-IT'
): string {
  if (!value) return 'Data sconosciuta';

  let date: Date;
  if (/^\d{8}$/.test(value)) {
    const y = value.substring(0, 4);
    const m = value.substring(4, 6);
    const d = value.substring(6, 8);
    date = new Date(`${y}-${m}-${d}`);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return 'Data sconosciuta';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(date);
}
