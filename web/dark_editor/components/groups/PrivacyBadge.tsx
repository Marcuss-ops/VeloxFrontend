import type { YouTubePrivacy } from '@/lib/youtube';

const STYLES: Record<string, string> = {
  public: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  unlisted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  private: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  unknown: 'bg-muted text-muted-foreground border-border',
};

export function PrivacyBadge({ value }: { value?: YouTubePrivacy }) {
  const normalized = (value || 'public').toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
        STYLES[normalized] ?? STYLES.unknown
      }`}
    >
      {normalized}
    </span>
  );
}
