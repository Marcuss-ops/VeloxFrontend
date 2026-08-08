export function thumbnailFallbackDataUrl(label = 'Thumbnail non disponibile'): string {
  const safeLabel = label.replace(/[<>&"']/g, '').slice(0, 42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#111827"/><rect x="48" y="48" width="1184" height="624" rx="28" fill="#1f2937" stroke="#475569" stroke-width="6"/><path d="M540 255h200v150H540z" fill="#64748b"/><circle cx="590" cy="305" r="18" fill="#cbd5e1"/><circle cx="650" cy="305" r="18" fill="#cbd5e1"/><circle cx="710" cy="305" r="18" fill="#cbd5e1"/><text x="640" y="500" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="38" text-anchor="middle">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
