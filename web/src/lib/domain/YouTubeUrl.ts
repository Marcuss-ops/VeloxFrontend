export type YouTubeUrl = string & { readonly __brand: 'YouTubeUrl' };

export const YouTubeUrl = {
  create(url: string): YouTubeUrl {
    if (!this.isValid(url)) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }
    return url as YouTubeUrl;
  },

  isValid(url: string | YouTubeUrl): boolean {
    const s = String(url || '').toLowerCase();
    return s.includes('youtube.com') || s.includes('youtu.be');
  },

  isVideoUrl(url: string | YouTubeUrl): boolean {
    const s = String(url || '').toLowerCase();
    return (
      s.includes('watch?v=') ||
      s.includes('youtu.be/') ||
      s.includes('/shorts/') ||
      s.includes('/embed/') ||
      /\/live\/[^/?#]+/.test(s)
    );
  },

  extractId(url: string | YouTubeUrl): string | null {
    const raw = String(url || '');
    if (!raw) return null;
    try {
      const u = new URL(raw);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1]?.split(/[/?]/)[0];
      if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1]?.split(/[/?]/)[0];
      if (u.pathname.includes('/live/')) return u.pathname.split('/live/')[1]?.split(/[/?]/)[0];
    } catch {
      // URL parsing failed
    }
    return null;
  },

  extractFirst(text: string): YouTubeUrl | null {
    const urls = String(text || '').match(/https?:\/\/[^\s]+/g) || [];
    const found = urls.find((u) => this.isValid(u));
    return found ? (found as YouTubeUrl) : null;
  },
};
