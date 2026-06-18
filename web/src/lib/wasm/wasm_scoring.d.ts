declare module 'wasm_scoring' {
    export function calculate_keyword_score(title: string, tags: string[]): number;
    export function calculate_video_relevance(
        title: string,
        channelTitle: string,
        tags: string[],
        viewCount?: number,
    ): { score: number; matched_tags: string[] };
    export function batch_calculate_keyword_scores(titles: string[], tags: string[]): number[];
}
