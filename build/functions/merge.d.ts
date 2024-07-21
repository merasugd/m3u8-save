import { error } from './error';
interface Segment {
    path: string;
}
interface Data {
    path: string;
    segments: Segment[];
}
export default function mergeSegments(data: Data, mergedPath?: string | null, ffmpegMerge?: boolean, ffmpegPath?: string): Promise<number | error>;
export {};
