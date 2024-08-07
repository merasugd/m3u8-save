export interface Caption {
    uri: string;
    lang: string;
}
export interface SavedSegment {
    path: string;
}
export interface Data {
    path: string;
    segments: SavedSegment[];
}
export interface Options {
    streamUrl: string;
    output: string;
    quality?: string;
    mergedPath?: string;
    cache?: string;
    concurrency?: number;
    captions?: Caption[];
    ffmpegPath?: string;
    ffmpegMerge?: boolean;
    cb?: (event: string, data: any) => void;
}
export interface Segment {
    uri?: string;
    path?: string;
    cached?: string;
}
export interface ProgressData {
    uri: string;
    path: string;
    progress: {
        total: number;
        current: number;
        percentage: number;
    };
}
export interface StreamableProgressData {
    uri: string;
    path: string;
    progress: {
        total: number;
        current: number;
        percentage: number;
    };
    attribute: {
        downloadSpeed: {
            string: string;
            number: number;
        };
        eta: {
            string: string;
            number: number;
        };
    };
}
export interface SegmentsData {
    totalSegments: number;
    segments: Segment[];
    path: string;
}
export type M3U8Events = {
    start: () => void;
    parsing: () => void;
    error: (err: Error) => void;
    'segments_download:build': () => void;
    'segments_download:start': (segments: Segment[]) => void;
    'segments_download:progress': (progressData: ProgressData) => void;
    'segments_download:end': (data: SegmentsData) => void;
    'merging:start': (isFFmpeg: boolean) => void;
    'merging:end': (mergedPath: string, isFFmpeg: boolean) => void;
    'conversion:start': () => void;
    'conversion:end': (captions: Caption[]) => void;
    end: (instanceOptions: Options) => void;
};
export interface ProgressCallback {
    (type: 'start' | 'progress' | 'end', data?: any): void;
}
