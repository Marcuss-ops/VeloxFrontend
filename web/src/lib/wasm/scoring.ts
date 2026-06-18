/**
 * WASM Scoring Module - TypeScript bindings and loader
 * 
 * Provides high-performance keyword scoring and video relevance
 * calculations via WebAssembly, replacing the JavaScript implementations
 * in GroupFeed.tsx and HomeView.tsx.
 * 
 * Usage:
 *   import { initScoringWasm, calculateKeywordScore } from '@/lib/wasm/scoring';
 *   
 *   await initScoringWasm();
 *   const score = calculateKeywordScore('My rap video', ['rap', 'hip hop']);
 */

type ScoringWasmModule = {
    calculate_keyword_score: (title: string, tags: string[]) => number;
    calculate_video_relevance: (title: string, channelTitle: string, tags: string[], viewCount?: number) => { score: number; matched_tags: string[] };
    batch_calculate_keyword_scores: (titles: string[], tags: string[]) => number[];
};

let wasmModule: ScoringWasmModule | null = null;
let initPromise: Promise<ScoringWasmModule> | null = null;

/**
 * Initialize the WASM scoring module.
 * Call this once at app startup.
 */
export async function initScoringWasm(): Promise<ScoringWasmModule> {
    if (wasmModule) return wasmModule;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Dynamic import of the WASM module (produced by wasm-pack or wasm-bindgen)
            const wasm = await import('wasm_scoring');
            wasmModule = wasm as ScoringWasmModule;
            return wasmModule!;
        } catch {
            // WASM not available - return a JS fallback implementation
            console.warn('[ScoringWasm] WASM module not available, using JS fallback');
            wasmModule = createJsFallback();
            return wasmModule;
        }
    })();

    return initPromise;
}

/**
 * Calculate keyword matching score (0-100) for a title against a set of tags.
 * 
 * @param title - The title to score
 * @param tags - Array of tags to match against
 * @returns Score from 0-100
 */
export function calculateKeywordScore(title: string, tags: string[]): number {
    if (!wasmModule) {
        return jsCalculateKeywordScore(title, tags);
    }
    return wasmModule.calculate_keyword_score(title, tags);
}

/**
 * Calculate video relevance score (0-100) with matched tags.
 * 
 * @param title - Video title
 * @param channelTitle - Channel name
 * @param tags - Tags to match
 * @param viewCount - Optional view count for bonus scoring
 * @returns Object with score and matched tags
 */
export function calculateVideoRelevance(
    title: string,
    channelTitle: string,
    tags: string[],
    viewCount?: number,
): { score: number; matched_tags: string[] } {
    if (!wasmModule) {
        return jsCalculateVideoRelevance(title, channelTitle, tags, viewCount);
    }
    return wasmModule.calculate_video_relevance(title, channelTitle, tags, viewCount);
}

/**
 * Batch calculate keyword scores for multiple titles.
 * Much faster than individual calls for large datasets.
 * 
 * @param titles - Array of titles to score
 * @param tags - Tags to match against (same for all titles)
 * @returns Array of scores (same order as titles)
 */
export function batchCalculateKeywordScores(titles: string[], tags: string[]): number[] {
    if (!wasmModule) {
        return titles.map(t => jsCalculateKeywordScore(t, tags));
    }
    return wasmModule.batch_calculate_keyword_scores(titles, tags);
}

// ─── JavaScript Fallback Implementations ─────────────────────────────────────

function jsCalculateKeywordScore(title: string, tags: string[]): number {
    if (tags.length === 0) return 0;

    const lowerTitle = title.toLowerCase();
    let score = 0;
    let matchCount = 0;

    const musicContext = [
        'music', 'rap', 'hip hop', 'hip-hop', 'artist', 'album', 'song',
        'drill', 'freestyle', 'rapper', 'beats', 'producer', 'label',
        'feat', 'ft', 'lyrics', 'video', 'youtube', 'spotify', 'streaming',
        'mc', 'dj', 'trap', 'gang', 'street', 'hood',
    ];
    const hasMusicContext = musicContext.some(kw => lowerTitle.includes(kw));

    const falsePositives = [
        'tourist', 'tourism', 'hotel', 'travel', 'blizzard', 'weather',
        'storm', 'value trap', 'mouse trap', 'animal', 'lion', 'coyote',
        'hunt', 'catch', 'warning', 'shutdown', 'airport', 'flight',
        'cancelled', 'trap camera', 'trap door', 'steam trap', 'drill bit',
        'drill press', 'power drill', 'drill machine', 'dental drill',
    ];
    const isFalsePositive = falsePositives.some(fp => lowerTitle.includes(fp));

    for (const tag of tags) {
        const tagRegex = new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (tagRegex.test(title)) {
            if (tag === 'trap' || tag === 'drill') {
                if (hasMusicContext && !isFalsePositive) { score += 50; matchCount++; }
                else if (!isFalsePositive) { score += 15; matchCount++; }
            } else {
                score += 40;
                matchCount++;
            }
        }
    }

    if (matchCount >= 2) score += matchCount * 15;
    if (hasMusicContext && matchCount > 0) score += 30;

    return Math.min(100, score);
}

function jsCalculateVideoRelevance(
    title: string,
    channelTitle: string,
    tags: string[],
    viewCount?: number,
): { score: number; matched_tags: string[] } {
    const lowerTitle = title.toLowerCase();
    const lowerChannel = channelTitle.toLowerCase();
    let score = 0;
    const matchedTags: string[] = [];

    for (const tag of tags) {
        const tagLower = tag.toLowerCase();
        if (lowerTitle.includes(tagLower) || lowerChannel.includes(tagLower)) {
            score += 25;
            matchedTags.push(tag);
        }
    }

    if (matchedTags.length >= 2) score += matchedTags.length * 10;
    if (matchedTags.length >= 3) score += 15;

    if (viewCount && viewCount > 100_000) score += 5;
    if (viewCount && viewCount > 500_000) score += 5;

    return { score: Math.min(100, score), matched_tags: matchedTags };
}

function createJsFallback(): ScoringWasmModule {
    return {
        calculate_keyword_score: jsCalculateKeywordScore,
        calculate_video_relevance: jsCalculateVideoRelevance,
        batch_calculate_keyword_scores: (titles, tags) =>
            titles.map(t => jsCalculateKeywordScore(t, tags)),
    };
}
